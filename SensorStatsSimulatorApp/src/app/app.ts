import { Component } from '@angular/core';
import { LiveChartComponent } from './LiveChart/LiveChart.component';
@Component({
  selector: 'app-root',
  imports: [LiveChartComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'SensorStatsSimulatorApp';
}
