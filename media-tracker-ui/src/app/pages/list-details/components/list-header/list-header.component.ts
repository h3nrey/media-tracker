import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Edit2 } from 'lucide-angular';

@Component({
  selector: 'app-list-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './list-header.component.html',
  styleUrl: './list-header.component.scss'
})
export class ListHeaderComponent {
  name = input<string | undefined>();
  description = input<string | undefined>();
  
  manageList = output<void>();

  readonly EditIcon = Edit2;

  onManageList() {
    this.manageList.emit();
  }
}
