import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
interface EventItem { date: string; title: string; detail: string; }
@Component({ selector: 'app-timeline-tab', standalone: true, imports: [FormsModule], templateUrl: './timeline-tab.html', styleUrl: './timeline-tab.css' })
export class TimelineTab {
  readonly items = signal<EventItem[]>(this.load());
  draft: EventItem = { date: '', title: '', detail: '' };
  add(): void { if (!this.draft.date || !this.draft.title.trim()) return; this.items.update(x => [{...this.draft}, ...x].sort((a,b)=>b.date.localeCompare(a.date))); this.draft={date:'',title:'',detail:''}; this.save(); }
  remove(item: EventItem): void { this.items.update(x => x.filter(y => y !== item)); this.save(); }
  private save(): void { localStorage.setItem('edusphare-admin-timeline', JSON.stringify(this.items())); }
  private load(): EventItem[] { try { return JSON.parse(localStorage.getItem('edusphare-admin-timeline') || '[]'); } catch { return []; } }
}