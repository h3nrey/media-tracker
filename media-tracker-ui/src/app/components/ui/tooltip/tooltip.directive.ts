import { Directive, ElementRef, HostListener, Input, Renderer2, inject, signal } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective {
  @Input('appTooltip') text: string = '';
  
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private tooltipEl: HTMLElement | null = null;

  @HostListener('mouseenter')
  onMouseEnter() {
    if (!this.text) return;
    this.show();
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.hide();
  }

  private show() {
    this.tooltipEl = this.renderer.createElement('span');
    this.renderer.appendChild(this.tooltipEl, this.renderer.createText(this.text));
    this.renderer.addClass(this.tooltipEl, 'app-tooltip');
    
    // Add to body to avoid clipping
    this.renderer.appendChild(document.body, this.tooltipEl);
    
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipEl!.getBoundingClientRect();
    
    const top = hostRect.top - tooltipRect.height - 8;
    const left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
    
    this.renderer.setStyle(this.tooltipEl, 'top', `${top + window.scrollY}px`);
    this.renderer.setStyle(this.tooltipEl, 'left', `${left + window.scrollX}px`);
    this.renderer.setStyle(this.tooltipEl, 'opacity', '1');
  }

  private hide() {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}
