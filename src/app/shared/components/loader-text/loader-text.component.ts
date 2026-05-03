import { Component, Input, ViewEncapsulation } from '@angular/core';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'app-loader-text',
  imports: [
    LoaderComponent
  ],
  templateUrl: './loader-text.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LoaderTextComponent {

  @Input() text:string = 'Cargando...';

}
