import { Pipe, PipeTransform } from '@angular/core';
import { Stage } from '../models';

/** Returns total count of years across all stages of a school. */
@Pipe({ name: 'stageYearCount', standalone: true, pure: true })
export class StageYearCountPipe implements PipeTransform {
  transform(stages: Stage[] | undefined | null): number {
    if (!stages) return 0;
    return stages.reduce((sum, s) => sum + (s.years?.length ?? 0), 0);
  }
}
