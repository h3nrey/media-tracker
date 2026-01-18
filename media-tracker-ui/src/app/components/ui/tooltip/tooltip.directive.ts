import { Directive, ElementRef, HostListener, Input, inject, ViewContainerRef, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  private overlay = inject(Overlay);
  private elementRef = inject(ElementRef);

  @Input('appTooltip') title?: string;
  @Input() items: string[] = [];
  @Input() color: string = 'var(--app-primary)';

  private overlayRef: OverlayRef | null = null;

  @HostListener('mouseenter')
  show() {
    if (!this.title && (!this.items || this.items.length === 0)) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 8
        },
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8
        }
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false
    });

    const tooltipPortal = new ComponentPortal(TooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    
    // Set inputs
    tooltipRef.setInput('title', this.title);
    tooltipRef.setInput('items', this.items);
    tooltipRef.setInput('color', this.color);
  }

  @HostListener('mouseleave')
  hide() {
    this.close();
  }

  ngOnDestroy() {
    this.close();
  }

  private close() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
