import { Component, ViewEncapsulation } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LoaderTextComponent } from '../loader-text/loader-text.component';

@Component({
  selector: 'app-loader-dialog',
  imports: [
    DialogModule,
    LoaderTextComponent
  ],
  templateUrl: './loader-dialog.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LoaderDialogComponent {

  display: boolean = false;

  textToShow: string = 'Cargando, por favor espere...';

  open(text: string) {
    this.textToShow = text;
    this.display = true;
  }

  close() {
    this.display = false;
  }

}
