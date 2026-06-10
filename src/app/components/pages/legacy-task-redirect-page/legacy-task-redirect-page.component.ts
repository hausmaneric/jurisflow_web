import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-legacy-task-redirect-page',
  standalone: true,
  template: ''
})
export class LegacyTaskRedirectPageComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const itemId = this.route.snapshot.paramMap.get('id') ?? '';
    const isEdit = this.route.snapshot.routeConfig?.path?.endsWith('/editar') ?? false;
    const agendaItemId = itemId && !itemId.includes(':') ? `task:${itemId}` : itemId;
    const target = itemId
      ? ['/plataforma/agenda', agendaItemId, ...(isEdit ? ['editar'] : [])]
      : ['/plataforma/agenda/novo'];

    await this.router.navigate(target, {
      replaceUrl: true,
      queryParams: { kind: 'task' }
    });
  }
}
