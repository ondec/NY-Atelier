import {groupFittingReadings, measurementUnit, measurementValue, type MeasurementUnit} from '@/lib/fitting-measurements';
import type {Fitting, MeasurementTemplate} from './customers-workspace';

export default function FittingReadings({fitting, fields, template, unit = 'cm'}: {
  fitting: Fitting; fields: Record<string, string>; template?: MeasurementTemplate; unit?: MeasurementUnit;
}) {
  return <div className="fitting-reading-sections">
    {groupFittingReadings(fitting, fields, template).map(group => <section className="fitting-reading-section" aria-label={`${group.title} measurements`} key={group.title}>
      <h4>{group.title}</h4>
      <dl className="fitting-reading-grid">{group.readings.map(reading => <div key={reading.id}>
        <dt>{reading.label}</dt>
        <dd>{measurementValue(reading.value, unit, reading.key)} <span>{measurementUnit(unit, reading.key)}</span></dd>
      </div>)}</dl>
    </section>)}
  </div>;
}
