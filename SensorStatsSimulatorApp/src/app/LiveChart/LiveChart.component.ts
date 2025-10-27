import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { SignalRService, SensorUpdate } from '../signalr.service';
import { Chart, ChartConfiguration, Legend, LinearScale, LineController, LineElement, PointElement, registerables, TimeScale, Title, Tooltip } from 'chart.js';
import 'chartjs-adapter-date-fns'; // <-- time adapter
import { Subscription } from 'rxjs';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-LiveChart',
  templateUrl: './LiveChart.component.html',
  styleUrls: ['./LiveChart.component.css']
})
export class LiveChartComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
//  private chart?: Chart<'line', { x: string | number | Date; y: number }[]>;
  private sub?: Subscription;

  sensorId = 'sensor-0000'; // default sensor
  private points: { x: number | Date; y: number }[] = [];
  private maxPoints = 200;


private chart?: Chart<'line', { x: Date; y: number }[]>;
private datasets: Record<string, { data: { x: Date; y: number }[], color: string }> = {};
private colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14']; // pick more if needed


  constructor(private sr: SignalRService) { }

  async ngOnInit() {
    debugger


 //  fetch snapshot first
  this.sr.getSnapshot('http://localhost:5103/api/sensors/snapshot').subscribe(snapshot => {
    
    if (snapshot[this.sensorId]) {
      this.points = snapshot[this.sensorId].map((p:any) => ({ x: new Date(p.timestamp) , y: p.value }));
      if(this.chart){
           (this.chart.data.datasets[0].data as any) = this.points;
            this.chart.update('none');
      }
    }
  });

  // connect SignalR hub
    await this.sr.startConnection('http://localhost:5103/hubs/sensors');

    const ctx = this.canvas.nativeElement.getContext('2d')!;
    // this.chart = new Chart(ctx, {
    //   type: 'line',
    //   data: {
    //     datasets: [
    //       {
    //         label: this.sensorId,
    //         data: this.points,
    //         backgroundColor: 'rgba(0, 123, 255, 0.2)',

    //         borderWidth: 2,

    //         tension: 0.3,
    //         borderColor: '#007bff',
    //         pointRadius: 0
    //       }
    //     ]
    //   },
    //   options: {
    //     animation: { duration: 0 },
    //     responsive: true,
    //     scales: {
    //       x: {
    //         type: 'time',
    //         time: {
    //           tooltipFormat: 'HH:mm:ss',
    //           unit: 'second'
    //         },
    //         ticks: { source: 'auto' }
    //       },
    //       y: { beginAtZero: false }
    //     }
    //   }
    // });

    this.chart = new Chart(ctx, {
  type: 'line',
  data: { datasets: [] }, // start empty, datasets added dynamically
  options: {
    responsive: true,
    animation: { duration: 0 },
    scales: {
      x: { type: 'time', time: { tooltipFormat: 'HH:mm:ss', unit: 'second' } },
      y: { beginAtZero: false },
    },
  },
});


    // subscribe to updates
    // // // this.sub = this.sr.updates$.subscribe((u: SensorUpdate) => {
    // // //   if (u.sensorId !== this.sensorId) return; // filter for selected sensor
    // // //   this.addPoint({ x:new Date( u.timestamp), y: u.value });
    // // // });

    this.sub = this.sr.updates$.subscribe((u: SensorUpdate) => {
      this.addPoint(u);
    });
  }

  // private addPoint(pt: { x: Date; y: number }) {
  //   this.points.push(pt);
  //   if (this.points.length > this.maxPoints) this.points.shift();

  //   if (this.chart) {
  //     (this.chart.data.datasets![0].data as any) = this.points;
  //     this.chart.update('none');
  //   }
  // }

  private addPoint(u: SensorUpdate) {
  const sensorId = u.sensorId;

  if (!this.datasets[sensorId]) {
    // assign a color based on how many sensors we have
    const color = this.colors[Object.keys(this.datasets).length % this.colors.length];

    this.datasets[sensorId] = { data: [], color };

    // add new dataset to chart
    this.chart?.data.datasets.push({
      label: sensorId,
      data: this.datasets[sensorId].data,
      borderColor: color,
      backgroundColor: color + '33', // semi-transparent
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    });
  }

  // add new point
  this.datasets[sensorId].data.push({ x: new Date(u.timestamp), y: u.value });

  // limit to max points (optional)
  if (this.datasets[sensorId].data.length > this.maxPoints) {
    this.datasets[sensorId].data.shift();
  }

  this.chart?.update('none');
}

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.sr.stop();
    this.chart?.destroy();
  }
}

