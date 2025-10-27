import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';

export interface SensorUpdate {
  sensorId: string;
  timestamp: string; // ISO
  value: number;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private updateSubject = new Subject<SensorUpdate>();

  updates$ = this.updateSubject.asObservable();

  constructor(private http: HttpClient) {}

  public startConnection(hubUrl: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('sensorUpdate', (data: any) => {
      // normalize
      this.updateSubject.next({
        sensorId: data.sensorId,
        timestamp: data.timestamp,
        value: data.value
      });
    });

    return this.hubConnection.start();
  }

  public stop() {
    return this.hubConnection?.stop();
  }

  // fetch snapshot from API
  public getSnapshot(apiUrl: string): Observable<{ [sensorId: string]: { timestamp: string; value: number }[] }> {
    return this.http.get<{ [sensorId: string]: { timestamp: string; value: number }[] }>(apiUrl);
  }
}
