import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeaderComponent } from './components/header.component';
import { ExplorerComponent } from './components/explorer.component';
import { CanvasComponent } from './components/canvas.component';
import { PropertiesComponent } from './components/properties.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, ExplorerComponent, CanvasComponent, PropertiesComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
