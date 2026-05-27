import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

interface FabPosition {
  x: number;
  y: number;
}

interface A11yState {
  fontSize: 14 | 16 | 18 | 20;
  highContrast: boolean;
  underlineLinks: boolean;
  wideSpacing: boolean;
}

const POSITION_KEY = 'a11y-fab-position';
const STATE_KEY = 'a11y-fab-state';
const FAB_SIZE = 56;
const MARGIN = 12;
const DRAG_THRESHOLD = 5;

const DEFAULT_STATE: A11yState = {
  fontSize: 16,
  highContrast: false,
  underlineLinks: false,
  wideSpacing: false,
};

@Component({
  selector: 'app-a11y-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a11y-fab.html',
  styleUrl: './a11y-fab.scss',
})
export class A11yFab implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fabButton = viewChild<ElementRef<HTMLButtonElement>>('fab');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly open = signal(false);
  protected readonly position = signal<FabPosition>(this.loadPosition());
  protected readonly state = signal<A11yState>(this.loadState());

  protected readonly fontSize = computed(() => this.state().fontSize);
  protected readonly highContrast = computed(() => this.state().highContrast);
  protected readonly underlineLinks = computed(() => this.state().underlineLinks);
  protected readonly wideSpacing = computed(() => this.state().wideSpacing);

  protected readonly fabStyle = computed(() => {
    const p = this.position();
    return `left: ${p.x}px; top: ${p.y}px;`;
  });

  private pointerStart: { x: number; y: number } | null = null;
  private elementStart: FabPosition | null = null;
  private dragging = false;
  private pointerId: number | null = null;

  constructor() {
    effect(() => {
      const s = this.state();
      this.applyState(s);
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(s));
      } catch {
        // ignore
      }
    });

    effect(() => {
      const p = this.position();
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(p));
      } catch {
        // ignore
      }
    });
  }

  ngAfterViewInit(): void {
    // Apply initial position with clamping now that we know the viewport.
    this.position.set(this.clamp(this.position()));
    this.applyState(this.state());
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.position.set(this.clamp(this.position()));
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.currentTarget as HTMLButtonElement;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.elementStart = { ...this.position() };
    this.dragging = false;
    this.pointerId = event.pointerId;
    target.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointerStart === null || this.elementStart === null) return;
    const dx = event.clientX - this.pointerStart.x;
    const dy = event.clientY - this.pointerStart.y;
    if (!this.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    this.dragging = true;
    this.position.set(
      this.clamp({ x: this.elementStart.x + dx, y: this.elementStart.y + dy }),
    );
  }

  protected onPointerUp(event: PointerEvent): void {
    const target = event.currentTarget as HTMLButtonElement;
    if (this.pointerId !== null && target.hasPointerCapture(this.pointerId)) {
      target.releasePointerCapture(this.pointerId);
    }
    const wasDragging = this.dragging;
    this.pointerStart = null;
    this.elementStart = null;
    this.dragging = false;
    this.pointerId = null;
    if (!wasDragging) {
      this.togglePanel();
    }
  }

  protected onPointerCancel(): void {
    this.pointerStart = null;
    this.elementStart = null;
    this.dragging = false;
    this.pointerId = null;
  }

  protected onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.togglePanel();
    }
  }

  protected togglePanel(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected close(): void {
    this.open.set(false);
    queueMicrotask(() => this.fabButton()?.nativeElement.focus());
  }

  private openPanel(): void {
    this.open.set(true);
    queueMicrotask(() => {
      const panel = this.panelRef()?.nativeElement;
      const first = panel?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    });
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected stepFont(delta: number): void {
    const order: A11yState['fontSize'][] = [14, 16, 18, 20];
    const current = this.state().fontSize;
    const idx = order.indexOf(current);
    const next = order[Math.max(0, Math.min(order.length - 1, idx + delta))];
    this.state.update((s) => ({ ...s, fontSize: next }));
  }

  protected resetFont(): void {
    this.state.update((s) => ({ ...s, fontSize: 16 }));
  }

  protected toggleHighContrast(): void {
    this.state.update((s) => ({ ...s, highContrast: !s.highContrast }));
  }

  protected toggleUnderlineLinks(): void {
    this.state.update((s) => ({ ...s, underlineLinks: !s.underlineLinks }));
  }

  protected toggleWideSpacing(): void {
    this.state.update((s) => ({ ...s, wideSpacing: !s.wideSpacing }));
  }

  protected resetAll(): void {
    this.state.set({ ...DEFAULT_STATE });
  }

  private clamp(p: FabPosition): FabPosition {
    if (typeof window === 'undefined') return p;
    const maxX = Math.max(MARGIN, window.innerWidth - FAB_SIZE - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - FAB_SIZE - MARGIN);
    return {
      x: Math.min(Math.max(MARGIN, p.x), maxX),
      y: Math.min(Math.max(MARGIN, p.y), maxY),
    };
  }

  private loadPosition(): FabPosition {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FabPosition;
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: window.innerWidth - FAB_SIZE - 20,
      y: window.innerHeight - FAB_SIZE - 20,
    };
  }

  private loadState(): A11yState {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<A11yState>;
        return {
          fontSize: normaliseFont(parsed?.fontSize),
          highContrast: !!parsed?.highContrast,
          underlineLinks: !!parsed?.underlineLinks,
          wideSpacing: !!parsed?.wideSpacing,
        };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_STATE };
  }

  private applyState(s: A11yState): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.fontSize = `${s.fontSize}px`;
    document.body.classList.toggle('a11y-high-contrast', s.highContrast);
    document.body.classList.toggle('a11y-underline-links', s.underlineLinks);
    document.body.classList.toggle('a11y-wide-spacing', s.wideSpacing);
  }
}

function normaliseFont(value: unknown): A11yState['fontSize'] {
  if (value === 14 || value === 16 || value === 18 || value === 20) return value;
  return 16;
}
