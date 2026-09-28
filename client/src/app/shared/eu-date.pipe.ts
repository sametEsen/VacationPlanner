import { Pipe, PipeTransform } from '@angular/core';

/** Converts ISO date string YYYY-MM-DD → DD/MM/YYYY */
@Pipe({ name: 'euDate', standalone: true })
export class EuDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}
