import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { Subscription } from 'rxjs';
import { LoaderTextComponent } from '../loader-text/loader-text.component';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';

@Component({
  selector: 'app-loader-dialog',
  imports: [
    DialogModule,
    LoaderTextComponent
  ],
  templateUrl: './loader-dialog.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LoaderDialogComponent implements OnInit, OnDestroy {
  private readonly dialogLoadingService = inject(DialogLoadingService);
  private readonly subscription = new Subscription();

  display: boolean = false;

  textToShow: string = 'Cargando, por favor espere...';

  ngOnInit(): void {
    this.subscription.add(
      this.dialogLoadingService.state$.subscribe((state) => {
        this.textToShow = state.text;
        this.display = state.visible;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  open(text: string) {
    this.textToShow = text;
    this.display = true;
  }

  close() {
    this.display = false;
  }

}
