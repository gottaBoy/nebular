import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  LOCALE_ID,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NbPortalDirective } from '../cdk/overlay/mapping';
import {
  NB_TIME_PICKER_CONFIG,
  NbSelectedTimeModel,
  NbSelectedTimePayload,
  NbTimePickerConfig,
  NbTimepickerTypes, TimeOptions,
} from './model';
import { NbDateService } from '../calendar-kit/services/date.service';
import { NbCalendarTimeModelService } from '../calendar-kit/services/calendar-time-model.service';
import { NbPlatform } from '../cdk/platform/platform-service';
import { convertToBoolProperty, NbBooleanInput } from '../helpers';
import { range, rangeFromTo } from '../calendar-kit/helpers';

/**
 * The TimePicker components itself.
 * Provides a proxy to `TimePicker` options as well as custom picker options.
 */
@Component({
  selector: 'nb-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  exportAs: 'nbTimepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NbTimePickerComponent<D> implements OnChanges, OnInit {
  _isTwelveHoursFormat: boolean;
  _withSeconds: boolean;
  _singleColumn: boolean;
  _step: number;
  _timeFormat: string;
  fullTimeOptions: D[];
  hoursColumnOptions: TimeOptions[];
  minutesColumnOptions: TimeOptions[];
  secondsColumnOptions: TimeOptions[];
  ampmColumnOptions: string[];
  readonly HOURS_IND_DAY: number = 12;
  fullTime: NbTimepickerTypes = NbTimepickerTypes.FULL_TIME;
  hour: NbTimepickerTypes = NbTimepickerTypes.HOUR;
  minute: NbTimepickerTypes = NbTimepickerTypes.MINUTE;
  sec: NbTimepickerTypes = NbTimepickerTypes.SECOND;
  ampm: NbTimepickerTypes = NbTimepickerTypes.AMPM;
  hostRef: ElementRef;

  /**
   * Defines time format string.
   * */
  get timeFormat(): string {
    return this._timeFormat;
  }

  set timeFormat(timeFormat: string) {
    this._timeFormat = timeFormat;
  }

  /**
   * Defines 12 hours format .
   * */
  @Input()
  get isTwelveHoursFormat(): boolean {
    return this._isTwelveHoursFormat;
  }
  set isTwelveHoursFormat(value: boolean) {
    this._isTwelveHoursFormat = convertToBoolProperty(value);
  };
  static ngAcceptInputType_isTwelveHoursFormat: NbBooleanInput;

  /**
   * Show seconds in timepicker.
   * Ignored when singleColumn is true
   * */
  @Input()
  get withSeconds(): boolean {
    return this._withSeconds;
  }
  set withSeconds(value: boolean) {
    this._withSeconds = convertToBoolProperty(value);
  };
  static ngAcceptInputType_withSeconds: NbBooleanInput;

  /**
   * Show timepicker values in one column with 60 minutes step by default.
   * */
  @Input()
  get singleColumn(): boolean {
    return this._singleColumn;
  }
  set singleColumn(value: boolean) {
    this._singleColumn = convertToBoolProperty(value);
  }
  static ngAcceptInputType_singleColumn: NbBooleanInput;

  /**
   * Defines minutes step when we use single column view.
   * If set to 20, it will be: '12:00, 12:20: 12:40, 13:00...'
   * */
  @Input()
  set step(step: number) {
    this._step = step;
  }
  get step(): number {
    return this._step;
  }

  /**
   * Date which will be rendered as selected.
   * */
  @Input()
  set date(date: D) {
    this._date = date;
    this.buildColumnOptions();
    this.cd.markForCheck();
  }
  get date(): D {
    return this._date;
  }

  _date: D;

  /**
   * In timepicker value should be always true
   * In calendar-with-time.component  should set to false
   * @docs-private
   */
  @Input() showFooter: boolean = true;
  @Input() applyButtonText: string;
  @Input() currentTimeButtonText: string;

  /**
   * Emits date when selected.
   * */
  @Output() onSelectTime: EventEmitter<NbSelectedTimePayload<D>> = new EventEmitter<NbSelectedTimePayload<D>>();
  @ViewChild(NbPortalDirective, {static: true}) portal: NbPortalDirective;

  constructor(@Inject(NB_TIME_PICKER_CONFIG) config: NbTimePickerConfig,
              protected platformService: NbPlatform,
              @Inject(LOCALE_ID) locale: string,
              protected cd: ChangeDetectorRef,
              protected calendarTimeModelService: NbCalendarTimeModelService<D>,
              protected dateService: NbDateService<D>) {
    if (config) {
      this.isTwelveHoursFormat = config.isTwelveHoursFormat;
    } else {
      this.isTwelveHoursFormat = dateService.getLocaleTimeFormat().includes('h');
    }
  }

  ngOnInit(): void {
    this.timeFormat = this.buildTimeFormat();
  }

  ngOnChanges({
                step,
                isTwelveHoursFormat,
                withSeconds,
                singleColumn,
              }: SimpleChanges): void {
    this.timeFormat = this.buildTimeFormat();

    if (!this.date) {
      return
    }
    if (step || isTwelveHoursFormat || withSeconds || singleColumn) {
      this.buildColumnOptions();
    }
  }

  setHost(hostRef: ElementRef): void {
    this.hostRef = hostRef;
  }

  attach(hostRef: ElementRef): void {
    this.hostRef = hostRef;
  }

  setCurrentTime(): void {
    this.date = this.dateService.today();
    this.onSelectTime.emit({
      time: this.date,
      format: this.timeFormat,
      twelveHourFormat: this.isTwelveHoursFormat,
      save: true,
    });
  }

  setHour(value: number): void {
    this.updateValue(this.dateService.setHour(this.date, value));
  }

  setMinute(value: number): void {
    this.updateValue(this.dateService.setMinute(this.date, value));
  }

  setSecond(value: number): void {
    this.updateValue(this.dateService.setSecond(this.date, value));
  }

  selectFullTime(value: D): void {
    this.updateValue(value);
  }

  changeAMPM({value}: NbSelectedTimeModel) {
    const currentDateAMPM: string = this.calendarTimeModelService.getAmPm(this.date);

    if (currentDateAMPM === value) {
      return;
    }

    const increment = (currentDateAMPM === this.calendarTimeModelService.PM ? -1 : 1) * this.HOURS_IND_DAY;

    this.updateValue(this.dateService.addHour(this.date, increment));
  }

  updateValue(date: D): void {
    this.onSelectTime.emit({time: date, twelveHourFormat: this.isTwelveHoursFormat, format: this.timeFormat});
  }

  saveValue(): void {
    this.onSelectTime.emit({
      time: this.date,
      twelveHourFormat: this.isTwelveHoursFormat,
      format: this.timeFormat,
      save: true,
    });
  }

  trackByTimeValues(index, item): any {
    return item.value;
  }

  showSeconds(): boolean {
    return this.withSeconds && !this.singleColumn;
  }

  isSelectedHour(val: number): boolean {
    return this.dateService.getHour(this.date) === val;
  }

  isSelectedMinute(val: number): boolean {
    return this.dateService.getMinute(this.date) === val;
  }

  isSelectedSecond(val: number): boolean {
    return this.dateService.getSecond(this.date) === val;
  }

  isSelectedAmPm(value: string): boolean {
    const hour: number = this.dateService.getHour(this.date);

    if (value === this.calendarTimeModelService.PM) {
      return hour >= this.HOURS_IND_DAY;
    } else {
      return this.dateService.getHour(this.date) < this.HOURS_IND_DAY;
    }
  }

  getFullTimeString(item: D): string {
    return this.dateService.format(item, this.timeFormat).toUpperCase()
  }

  isSelectedFullTimeValue(value: D): boolean {
    return this.dateService.isEqualTime(value, this.date, false);
  }

  buildColumnOptions(): void {
    this.timeFormat = this.buildTimeFormat();
    this.fullTimeOptions = this.singleColumn ?
      this.calendarTimeModelService.getFullHours(this.isTwelveHoursFormat, this.step) : [];

    this.hoursColumnOptions = this.generateHours();
    this.minutesColumnOptions = this.generateMinutesOrSeconds();
    this.secondsColumnOptions = this.withSeconds ? this.generateMinutesOrSeconds() : [];

    this.ampmColumnOptions = this.isTwelveHoursFormat ? this.calendarTimeModelService.AMPM : [];
  }

  isFirefox(): boolean {
    return this.platformService.FIREFOX;
  }

  generateHours(): TimeOptions[] {
    if (!this.isTwelveHoursFormat) {
      return range(23, (v: number) => {
        return {value: v, text: this.calendarTimeModelService.formatToString(v)};
      });
    }

    if (this.calendarTimeModelService.isAm(this.date)) {
      return (range(12, (v: number) => {
        const text = v === 0 ? 12 : v;
        return {value: v, text: this.calendarTimeModelService.formatToString(text)}
      }));
    }

    return (rangeFromTo(12, 24, (v: number) => {
      const text = v === 12 ? 12 : (v - 12);
      return {value: v, text: this.calendarTimeModelService.formatToString(text)}
    }));
  }

  generateMinutesOrSeconds(): TimeOptions[] {
    return range(60, (v: number) => {
      return {value: v, text: this.calendarTimeModelService.formatToString(v)};
    });
  }

  buildTimeFormat(): string {
    if (this.isTwelveHoursFormat) {
      return `${this.withSeconds && !this.singleColumn ? this.calendarTimeModelService.twelveTimeFormatWithSeconds
        : this.calendarTimeModelService.twelveHoursTimeFormat}`;
    } else {
      return `${this.withSeconds && !this.singleColumn ? this.calendarTimeModelService.timeFormatWithSeconds
        : this.calendarTimeModelService.timeFormat}`;
    }
  }
}
