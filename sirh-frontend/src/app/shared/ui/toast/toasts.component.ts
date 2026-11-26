import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="toast.type">
          <span class="icon">
            @switch (toast.type) {
              @case ('success') { ✅ }
              @case ('error') { ❌ }
              @case ('warning') { ⚠️ }
              @case ('info') { ℹ️ }
            }
          </span>
          <span class="message">{{ toast.message }}</span>
          <button class="close-btn" (click)="toastService.remove(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 280px;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #F1F5F9;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .icon { font-size: 1.25rem; }
    .message { flex: 1; font-size: 0.9rem; font-weight: 500; }
    .close-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }
    .close-btn:hover { color: #F1F5F9; }

    .toast.success { border-left: 4px solid #10B981; }
    .toast.error   { border-left: 4px solid #EF4444; }
    .toast.warning { border-left: 4px solid #F59E0B; }
    .toast.info    { border-left: 4px solid #3B82F6; }
  `]
})
export class ToastsComponent {
  toastService = inject(ToastService);
  toasts = this.toastService.getToasts();
}
