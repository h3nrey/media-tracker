import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  template: `
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="isOpen"
      [cdkConnectedOverlayHasBackdrop]="hasBackdrop"
      [cdkConnectedOverlayBackdropClass]="backdropClass"
      (backdropClick)="onBackdropClick()"
      [cdkConnectedOverlayPositions]="positions"
      (detach)="close.emit()"
    >
      <div 
        class="popover-wrapper" 
        [ngStyle]="customStyle"
        (click)="$event.stopPropagation()"
      >
        <ng-content></ng-content>
      </div>
    </ng-template>
  `,
  styles: [`
    .popover-wrapper {
      background: rgba(11, 14, 20, 0.98);
      backdrop-filter: blur(12px);
      border: 1px solid var(--app-border);
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      animation: popoverEnter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
    }

    @keyframes popoverEnter {
      from { 
        opacity: 0; 
        transform: scale(0.95);
      }
      to { 
        opacity: 1; 
        transform: scale(1);
      }
    }
  `]
})
export class PopoverComponent {
  @Input({ required: true }) origin: any;
  @Input() isOpen = false;
  @Input() hasBackdrop = true;
  @Input() backdropClass = 'cdk-overlay-transparent-backdrop';
  @Input() customStyle: { [key: string]: string } = {};
  @Input() positions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
    }
  ];

  @Output() close = new EventEmitter<void>();

  onBackdropClick() {
    this.close.emit();
  }
}
