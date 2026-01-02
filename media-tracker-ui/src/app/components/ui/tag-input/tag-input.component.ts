import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss'
})
export class TagInputComponent {
  @Input() tags: string[] = [];
  @Input() placeholder: string = 'Add tags...';
  @Output() tagsChange = new EventEmitter<string[]>();
  
  readonly XIcon = X;
  inputValue = '';

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    if (value.includes(',')) {
      this.addTagsFromInput(value);
      input.value = '';
      this.inputValue = '';
    } else {
      this.inputValue = value;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTagsFromInput(this.inputValue);
      this.inputValue = '';
      (event.target as HTMLInputElement).value = '';
    } else if (event.key === 'Backspace' && !this.inputValue && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
    }
  }

  onBlur() {
    if (this.inputValue.trim()) {
      this.addTagsFromInput(this.inputValue);
      this.inputValue = '';
    }
  }

  private addTagsFromInput(value: string) {
    const newTags = value.split(',')
      .map(t => t.trim())
      .filter(t => t && !this.tags.includes(t));
      
    if (newTags.length > 0) {
      this.tags = [...this.tags, ...newTags];
      this.tagsChange.emit(this.tags);
    }
  }

  removeTag(index: number) {
    this.tags = this.tags.filter((_, i) => i !== index);
    this.tagsChange.emit(this.tags);
  }
}
