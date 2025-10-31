import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { Chart, registerables, ChartDataset } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import 'chartjs-adapter-date-fns';
import { Subscription } from 'rxjs';
import { SignalRService, SensorUpdate } from '../signalr.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ColorUtils } from '../color-utils';

Chart.register(...registerables, MatrixController, MatrixElement);

type HeatmapCell = { x: number; y: number; v: number; sensorId: string };

@Component({
 selector: 'app-LiveChart',
  templateUrl: './LiveChart.component.html',
  styleUrls: ['./LiveChart.component.css'],
  imports:[CommonModule]
})
export class LiveChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heatmapCanvas') heatmapCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('detailCanvas') detailCanvas!: ElementRef<HTMLCanvasElement>;

private heatmapChart?: Chart<any, any, any>;
  private detailChart?: Chart<'line'>;
  private sub?: Subscription;

  // map sensorId -> { x,y,value } for heatmap and history buffer
  private sensorsMeta: Record<string, { x: number; y: number; value: number }> = {};
  private sensorHistory: Record<string, { x: Date; y: number }[]> = {};

  selectedSensorId?: string;

  // Configuration
  gridCols = 100; // for a 100x100 grid = 10k cells
  gridRows = 100;
  maxHistoryPoints = 500; // per-sensor history for detail view
  redrawThrottleMs = 150; // throttle heatmap updates to e.g. every 150ms
  maxSensors = 10000;
  // small internal timer for throttling updates
  private pendingHeatmapUpdate = false;
  private lastHeatmapUpdate = 0;

  currentSensorsData = 0;
  // Snapshot URL - adjust to your API
  private snapshotUrl = 'http://localhost:5103/api/sensors/snapshot';

  constructor(
    private sr: SignalRService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // nothing heavy here
  }

  async ngAfterViewInit(): Promise<void> {
    // 1) Create blank heatmap chart
    this.createHeatmapChart();

    // 2) Fetch snapshot, then connect SignalR
    this.loadSnapshotAndConnect();
  }

  private createHeatmapChart() {
  
    const canvas = this.heatmapCanvas.nativeElement;
  
   const ctx = canvas.getContext('2d')!;

 // Get browser window size (not canvas CSS size)
  const displayWidth = window.innerWidth * 0.9;   // 90vw
  const displayHeight = window.innerHeight * 0.9; // 90vh

  // Set the canvas pixel size to match viewport percentage
  canvas.width = displayWidth;
  canvas.height = displayHeight;

   console.log(`Canvas size After: ${displayWidth}x${displayHeight}`);


// Ideal grid as close to a square as possible
const cols = Math.ceil(Math.sqrt(this.maxSensors));
const rows = Math.ceil(this.maxSensors / cols);

console.log(`Grid: ${rows} rows x ${cols} cols`);
   
const cellSize = 10;//Math.max(4, Math.floor(800 / this.gridCols)); // adapt size

    this.heatmapChart = new Chart(ctx, {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Sensors Heatmap',
          data: [] as HeatmapCell[],
         backgroundColor: (ctx: any) => {
            if (!ctx.raw) return 'rgba(200,200,200,0.2)';
            const cell = ctx.raw as HeatmapCell;
            return ColorUtils.multiBandColor(cell.v, cell.x, cols);
          },
         
           width: cellSize,
           height: cellSize,
          borderWidth: 1
        } as unknown as ChartDataset<'matrix', any>],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false, min: 0, max: this.gridCols },
          y: { display: false, min: 0, max: this.gridRows },
        },
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              // show sensorId + value
              label: (context) => {
                const raw = context.raw as any;
                return `${raw.sensorId}: ${raw.v}`;
              }
            }
          },
          legend: { display: false }
        },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          // elements[0] is the clicked element
          const el = elements[0];
          // DatasetIndex and index -> get raw element
          const dataset = this.heatmapChart!.data.datasets[el.datasetIndex];
          const raw = (dataset.data as any)[el.index] as HeatmapCell;
          if (raw && raw.sensorId) {
            this.openDetailForSensor(raw.sensorId);
          }
        }
      }
    }) as Chart<any, any, any>;
  }

  private async loadSnapshotAndConnect() {
    try {
      // Call snapshot API
      const snapshot = await this.http.get<Record<string, { timestamp: string; value: number }[]>>(this.snapshotUrl).toPromise();

      // snapshot is expected: { sensorId: [{ timestamp, value }, ...], ... }
      if (snapshot) {
        // populate sensorsMeta and history
        const sensorIds = Object.keys(snapshot);
        for (let i = 0; i < sensorIds.length; i++) {
          const id = sensorIds[i];
          // assign grid coordinates; if API has coordinates you'd prefer using them
          const x = i % this.gridCols;
          const y = Math.floor(i / this.gridCols);
          const values = snapshot[id] || [];

          // store latest value if exists
          const latest = values.length ? values[values.length - 1] : null;
          this.sensorsMeta[id] = { x, y, value: latest ? latest.value : 0 };

          // fill history up to maxHistoryPoints
          this.sensorHistory[id] = (values || []).slice(-this.maxHistoryPoints).map(v => ({ x: new Date(v.timestamp), y: v.value }));
        }

        // draw initial heatmap
        this.scheduleHeatmapUpdate(true);
      }
    } catch (err) {
      console.warn('Snapshot load failed, continuing with live updates', err);
    }

    // start SignalR and subscribe
    try {
      await this.sr.startConnection('http://localhost:5103/hubs/sensors');
    } catch (e) {
      console.error('SignalR start failed', e);
    }

    // subscribe to updates
    this.sub = this.sr.updates$.subscribe((u: SensorUpdate) => {
      this.handleLiveUpdate(u);
    });
  }

  private handleLiveUpdate(u: SensorUpdate) {
    const id = u.sensorId;

    // if new sensor and grid is not full, assign next available index
    if (!this.sensorsMeta[id]) {
      const idx = Object.keys(this.sensorsMeta).length;
      const x = idx % this.gridCols;
      const y = Math.floor(idx / this.gridCols);
      this.sensorsMeta[id] = { x, y, value: u.value };
      this.sensorHistory[id] = [];
    }

    // update latest value
    this.sensorsMeta[id].value = u.value;

    // append to history buffer
    const hist = this.sensorHistory[id];
    hist.push({ x: new Date(u.timestamp), y: u.value });
    if (hist.length > this.maxHistoryPoints) hist.shift();

    // If detail view is open for this sensor, update line chart instantly
    if (this.selectedSensorId === id) {
      this.updateDetailChartData(id);
    }

    // throttle heatmap redraws for performance
    this.scheduleHeatmapUpdate();
  }

  private scheduleHeatmapUpdate(force = false) {
    const now = Date.now();
    if (force || now - this.lastHeatmapUpdate >= this.redrawThrottleMs) {
      this.doHeatmapUpdate();
      this.lastHeatmapUpdate = now;
    } else {
      if (this.pendingHeatmapUpdate) return;
      this.pendingHeatmapUpdate = true;
      setTimeout(() => {
        this.doHeatmapUpdate();
        this.pendingHeatmapUpdate = false;
        this.lastHeatmapUpdate = Date.now();
      }, this.redrawThrottleMs - (now - this.lastHeatmapUpdate));
    }
  }

  private doHeatmapUpdate() {
    if (!this.heatmapChart) return;
    const cells: HeatmapCell[] = Object.entries(this.sensorsMeta).map(([sensorId, m]) => ({
      x: m.x,
      y: m.y,
      v: m.value,
      sensorId
    }));

    (this.heatmapChart.data.datasets![0].data as any) = cells;

    this.currentSensorsData = cells.length;
    // update without animation and minimal work
    this.heatmapChart.update('none');
  }

  // convert numeric value into a color string: gradient from green(low) to red(high)
  private valueToColor(value: number) {
    // adjust range mapping to your expected sensor range
    const min = 0;
    const max = 100;
    const v = Math.max(min, Math.min(max, value));
    const norm = (v - min) / (max - min); // 0..1

    const r = Math.round(255 * norm);
    const g = Math.round(255 * (1 - norm));
    const b = 30;
    const alpha = 0.9;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Open inline detail chart for a sensor
  private openDetailForSensor(sensorId: string) {
    this.selectedSensorId = sensorId;
     setTimeout(() => this.renderDetailChart(sensorId), 0);
  }

  private renderDetailChart(sensorId: string) {
    const ctx = this.detailCanvas.nativeElement.getContext('2d')!;

    if (this.detailChart) {
      this.detailChart.destroy();
      this.detailChart = undefined;
    }

    const history = this.sensorHistory[sensorId] || [];

    this.detailChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: sensorId,
          data: history.map(h => ({ x: h.x.getTime(), y: h.y })),
          borderColor: '#1976d2',
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'PPpp', unit: 'minute' }
          },
          y: { beginAtZero: false }
        }
      }
    });
  }

  private updateDetailChartData(sensorId: string) {
    if (!this.detailChart) return;
    const hist = this.sensorHistory[sensorId] || [];
    (this.detailChart.data.datasets![0].data as any) = hist.map(h => ({ x: h.x, y: h.y }));
    this.detailChart.update('none');
  }

  // Allow closing detail view
  closeDetail() {
    this.selectedSensorId = undefined;
    if (this.detailChart) {
      this.detailChart.destroy();
      this.detailChart = undefined;
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sr.stop();
    this.heatmapChart?.destroy();
    this.detailChart?.destroy();
  }
}
