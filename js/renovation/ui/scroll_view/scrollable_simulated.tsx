import {
  Component,
  JSXComponent,
  Method,
  Ref,
  Effect,
  RefObject,
  ComponentBindings,
  Event,
  InternalState,
} from 'devextreme-generator/component_declaration/common';
import { EventCallback } from '../common/event_callback.d';
import { subscribeToScrollEvent } from '../../utils/subscribe_to_event';
import { Scrollbar } from './scrollbar';
import { Widget } from '../common/widget';
import { combineClasses } from '../../utils/combine_classes';
import { DisposeEffectReturn } from '../../utils/effect_return.d';
import { isDxMouseWheelEvent, normalizeKeyName } from '../../../events/utils/index';
import { getWindow, hasWindow } from '../../../core/utils/window';
import { getBoundingRect } from '../../../core/utils/position';
import { titleize } from '../../../core/utils/inflector';
import { isDefined } from '../../../core/utils/type';
/* eslint-disable-next-line import/named */
import { dxPromise, when } from '../../../core/utils/deferred';
import $ from '../../../core/renderer';

import BaseWidgetProps from '../../utils/base_props';
import {
  ScrollableProps,
} from './scrollable_props';
import { TopPocketProps } from './top_pocket_props';
import { BottomPocketProps } from './bottom_pocket_props';
import {
  ScrollableLocation, ScrollableShowScrollbar, ScrollOffset,
  allowedDirection, ScrollEventArgs,
} from './types.d';

import {
  ensureLocation, ScrollDirection, normalizeCoordinate,
  getContainerOffsetInternal,
  getElementLocation, getPublicCoordinate, getBoundaryProps,
  getElementWidth, getElementHeight, getElementStyle,
  updateAllowedDirection,
  DIRECTION_VERTICAL,
  DIRECTION_HORIZONTAL,
  SCROLLABLE_SIMULATED_CLASS,
  SCROLLABLE_CONTAINER_CLASS,
  SCROLLABLE_CONTENT_CLASS,
  SCROLLABLE_WRAPPER_CLASS,
  SCROLLVIEW_CONTENT_CLASS,
  SCROLLABLE_DISABLED_CLASS,
  SCROLLABLE_SCROLLBARS_HIDDEN,
  SCROLLABLE_SCROLLBARS_ALWAYSVISIBLE,
  SCROLL_LINE_HEIGHT,
  SCROLLABLE_SCROLLBAR_CLASS,
} from './scrollable_utils';

import { TopPocket } from './top_pocket';
import { BottomPocket } from './bottom_pocket';

import {
  dxScrollInit,
  dxScrollStart,
  dxScrollMove,
  dxScrollEnd,
  dxScrollStop,
  dxScrollCancel,
} from '../../../events/short';

const KEY_CODES = {
  PAGE_UP: 'pageUp',
  PAGE_DOWN: 'pageDown',
  END: 'end',
  HOME: 'home',
  LEFT: 'leftArrow',
  UP: 'upArrow',
  RIGHT: 'rightArrow',
  DOWN: 'downArrow',
  TAB: 'tab',
};

function visibilityModeNormalize(mode: any): ScrollableShowScrollbar {
  if (mode === true) {
    return 'onScroll';
  }
  return (mode === false) ? 'never' : mode;
}

export const viewFunction = (viewModel: ScrollableSimulated): JSX.Element => {
  const {
    cssClasses, wrapperRef, contentRef, containerRef, onWidgetKeyDown,
    horizontalScrollbarRef, verticalScrollbarRef,
    cursorEnterHandler, cursorLeaveHandler,
    scaleRatioWidth, scaleRatioHeight,
    isScrollbarVisible, needScrollbar,
    scrollableOffsetLeft, scrollableOffsetTop,
    contentWidth, containerWidth, contentHeight, containerHeight,
    scrollableRef,
    props: {
      disabled, height, width, rtlEnabled, children,
      forceGeneratePockets, needScrollViewContentWrapper,
      showScrollbar, direction, scrollByThumb, pullingDownText, pulledDownText, refreshingText,
      reachBottomText, useKeyboard, bounceEnabled,
    },
    restAttributes,
  } = viewModel;

  const targetDirection = direction ?? 'vertical';
  const isVertical = targetDirection !== 'horizontal';
  const isHorizontal = targetDirection !== 'vertical';

  const visibilityMode = visibilityModeNormalize(showScrollbar);
  return (
    <Widget
      rootElementRef={scrollableRef}
      focusStateEnabled={useKeyboard}
      hoverStateEnabled
      classes={cssClasses}
      disabled={disabled}
      rtlEnabled={rtlEnabled}
      height={height}
      width={width}
      onKeyDown={onWidgetKeyDown}
      onHoverStart={cursorEnterHandler}
      onHoverEnd={cursorLeaveHandler}
      {...restAttributes} // eslint-disable-line react/jsx-props-no-spreading
    >
      <div className={SCROLLABLE_WRAPPER_CLASS} ref={wrapperRef}>
        <div
          className={SCROLLABLE_CONTAINER_CLASS}
          ref={containerRef}
        >
          <div className={SCROLLABLE_CONTENT_CLASS} ref={contentRef}>
            {forceGeneratePockets && (
            <TopPocket
              pullingDownText={pullingDownText}
              pulledDownText={pulledDownText}
              refreshingText={refreshingText}
              refreshStrategy="simulated"
            />
            )}
            {needScrollViewContentWrapper && (
              <div className={SCROLLVIEW_CONTENT_CLASS}>{children}</div>)}
            {!needScrollViewContentWrapper && children}
            {forceGeneratePockets && (
            <BottomPocket
              reachBottomText={reachBottomText}
            />
            )}
          </div>
          {isHorizontal && (
            <Scrollbar
              ref={horizontalScrollbarRef}
              containerRef={containerRef}
              contentRef={contentRef}
              scaleRatio={scaleRatioWidth}
              scrollableOffset={scrollableOffsetLeft}
              contentSize={contentWidth}
              containerSize={containerWidth}
              direction="horizontal"
              visible={isScrollbarVisible}
              visibilityMode={visibilityMode}
              scrollByThumb={scrollByThumb}
              expandable={scrollByThumb}
              bounceEnabled={bounceEnabled}
              needScrollbar={needScrollbar}
            />
          )}
          {isVertical && (
            <Scrollbar
              ref={verticalScrollbarRef}
              containerRef={containerRef}
              contentRef={contentRef}
              scaleRatio={scaleRatioHeight}
              scrollableOffset={scrollableOffsetTop}
              contentSize={contentHeight}
              containerSize={containerHeight}
              direction="vertical"
              visible={isScrollbarVisible}
              visibilityMode={visibilityMode}
              scrollByThumb={scrollByThumb}
              expandable={scrollByThumb}
              bounceEnabled={bounceEnabled}
              needScrollbar={needScrollbar}
            />
          )}
        </div>
      </div>
    </Widget>
  );
};

@ComponentBindings()
export class ScrollableSimulatedProps extends ScrollableProps {
  @Event() onStart?: EventCallback<ScrollEventArgs>;

  @Event() onEnd?: EventCallback<ScrollEventArgs>;

  @Event() onBounce?: EventCallback<ScrollEventArgs>;

  @Event() onStop?: EventCallback<ScrollEventArgs>;
}

type ScrollableSimulatedPropsType = ScrollableSimulatedProps & Pick<BaseWidgetProps, 'rtlEnabled' | 'disabled' | 'width' | 'height' | 'onKeyDown' | 'visible' >
& Pick<TopPocketProps, 'pullingDownText' | 'pulledDownText' | 'refreshingText'>
& Pick<BottomPocketProps, 'reachBottomText'>;

@Component({
  defaultOptionRules: null,
  view: viewFunction,
})
export class ScrollableSimulated extends JSXComponent<ScrollableSimulatedPropsType>() {
  @Ref() scrollableRef!: RefObject<HTMLDivElement>;

  @Ref() wrapperRef!: RefObject<HTMLDivElement>;

  @Ref() contentRef!: RefObject<HTMLDivElement>;

  @Ref() containerRef!: RefObject<HTMLDivElement>;

  @Ref() verticalScrollbarRef!: RefObject<any>; // TODO: any -> Scrollbar (Generators)

  @Ref() horizontalScrollbarRef!: RefObject<any>; // TODO: any -> Scrollbar (Generators)

  @InternalState() isHovered = false;

  @InternalState() baseContainerToContentRatio = 0;

  @InternalState() scaleRatioWidth;

  @InternalState() scaleRatioHeight;

  @InternalState() scrollableOffsetLeft = 0;

  @InternalState() scrollableOffsetTop = 0;

  @InternalState() contentWidth = 0;

  @InternalState() contentHeight = 0;

  @InternalState() containerWidth = 0;

  @InternalState() containerHeight = 0;

  @InternalState() validDirections = {};

  @InternalState() cachedVariables = {};

  @Method()
  content(): HTMLDivElement {
    return this.contentRef;
  }

  @Method()
  scrollBy(distance: number | Partial<ScrollableLocation>): void {
    const location = ensureLocation(distance);
    const { isVertical, isHorizontal } = new ScrollDirection(this.props.direction);

    if (isVertical) {
      this.containerRef.scrollTop += Math.round(location.top);
    }
    if (isHorizontal) {
      this.containerRef.scrollLeft += normalizeCoordinate('left', Math.round(location.left), this.props.rtlEnabled);
    }
  }

  @Method()
  scrollTo(targetLocation: number | Partial<ScrollableLocation>): void {
    const location = ensureLocation(targetLocation);
    const containerPosition = this.scrollOffset();

    const top = location.top - containerPosition.top;
    const left = location.left - containerPosition.left;

    this.scrollBy({ top, left });
  }

  @Method()
  scrollToElement(element: HTMLElement, offset?: Partial<ScrollOffset>): void {
    if (element === undefined || element === null) {
      return;
    }

    if (element.closest(`.${SCROLLABLE_CONTENT_CLASS}`)) {
      const scrollOffset = {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...(offset as Partial<ScrollOffset>),
      };

      this.scrollTo({
        top: getElementLocation(
          element, scrollOffset, DIRECTION_VERTICAL, this.containerRef, this.props.rtlEnabled,
        ),
        left: getElementLocation(
          element, scrollOffset, DIRECTION_HORIZONTAL, this.containerRef, this.props.rtlEnabled,
        ),
      });
    }
  }

  @Method()
  scrollHeight(): number {
    return this.content().offsetHeight;
  }

  @Method()
  scrollWidth(): number {
    return this.content().offsetWidth;
  }

  @Method()
  scrollOffset(): ScrollableLocation {
    const { rtlEnabled } = this.props;
    const { left, top } = getContainerOffsetInternal(this.containerRef);
    return {
      left: getPublicCoordinate('left', left, this.containerRef, rtlEnabled),
      top: getPublicCoordinate('top', top, this.containerRef, rtlEnabled),
    };
  }

  @Method()
  scrollTop(): number {
    return this.scrollOffset().top;
  }

  @Method()
  scrollLeft(): number {
    return this.scrollOffset().left;
  }

  @Method()
  clientHeight(): number {
    return this.containerRef.clientHeight;
  }

  @Method()
  clientWidth(): number {
    return this.containerRef.clientWidth;
  }

  @Effect() scrollEffect(): DisposeEffectReturn {
    return subscribeToScrollEvent(this.containerRef,
      (event: Event) => this.props.onScroll?.({
        event,
        scrollOffset: this.scrollOffset(),
        ...getBoundaryProps(this.props.direction, this.scrollOffset(), this.containerRef),
      }));
  }

  @Effect()
  initEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    /* istanbul ignore next */
    dxScrollInit.on(this.wrapperRef,
      (e: Event) => {
        this.handleInit(e);
      }, {
        getDirection: (e) => this.getDirection(e),
        validate: (e) => this.validate(e),
        isNative: false,
        scrollTarget: this.containerRef,
      }, { namespace });

    return (): void => dxScrollInit.off(this.wrapperRef, { namespace });
  }

  @Effect()
  startEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    dxScrollStart.on(this.wrapperRef,
      (e: Event) => {
        this.handleStart(e);
      }, { namespace });

    return (): void => dxScrollStart.off(this.wrapperRef, { namespace });
  }

  @Effect()
  moveEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    dxScrollMove.on(this.wrapperRef,
      (e: Event) => {
        this.handleMove(e);
      }, { namespace });

    return (): void => dxScrollMove.off(this.wrapperRef, { namespace });
  }

  @Effect()
  endEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    dxScrollEnd.on(this.wrapperRef,
      (e: Event) => {
        this.handleEnd(e);
      }, { namespace });

    return (): void => dxScrollEnd.off(this.wrapperRef, { namespace });
  }

  @Effect()
  stopEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    dxScrollStop.on(this.wrapperRef,
      (event: Event) => {
        this.handleStop(event);
      }, { namespace });

    return (): void => dxScrollStop.off(this.wrapperRef, { namespace });
  }

  @Effect()
  cancelEffect(): DisposeEffectReturn {
    const namespace = 'dxScrollable';

    dxScrollCancel.on(this.wrapperRef,
      (event: Event) => {
        this.handleCancel(event);
      }, { namespace });

    return (): void => dxScrollCancel.off(this.wrapperRef, { namespace });
  }

  cursorEnterHandler(): void {
    if (this.isHoverMode()) {
      this.isHovered = true;
    }
  }

  cursorLeaveHandler(): void {
    if (this.isHoverMode()) {
      this.isHovered = false;
    }
  }

  /* istanbul ignore next */
  // eslint-disable-next-line
  handleInit(e: Event): void {
    this.suppressDirections(e);
    // this._eventForUserAction = e;
    this.eventHandler(
      (scrollbar) => scrollbar.initHandler(e),
    ).done(() => {}); // this._stopAction
    // console.log('initHandler', event, this);
  }
  /* istanbul ignore next */
  // eslint-disable-next-line
  private handleStart(event: Event): void {
    // console.log('handleEnd', event, this);
  }
  /* istanbul ignore next */
  // eslint-disable-next-line
  private handleMove(event: Event): void {
    // console.log('handleEnd', event, this);
  }
  /* istanbul ignore next */
  // eslint-disable-next-line
  private handleEnd(event: Event): void {
    // console.log('handleEnd', event, this);
  }
  /* istanbul ignore next */
  // eslint-disable-next-line
  private handleStop(event: Event): void {
    // console.log('handleStop', event, this);
  }
  /* istanbul ignore next */
  // eslint-disable-next-line
  private handleCancel(event: Event): void {
    // console.log('handleCancel', event, this);
  }

  suppressDirections(e): void {
    if (isDxMouseWheelEvent(e.originalEvent)) {
      this.prepareDirections(true);
      return;
    }

    this.prepareDirections(false);

    const { isVertical, isHorizontal } = new ScrollDirection(this.props.direction);
    if (isVertical) {
      const isValid = this.validateEvent(e, this.verticalScrollbarRef);
      this.validDirections[DIRECTION_VERTICAL] = isValid;
    }
    if (isHorizontal) {
      const isValid = this.validateEvent(e, this.horizontalScrollbarRef);
      this.validDirections[DIRECTION_HORIZONTAL] = isValid;
    }
  }

  validateEvent(e, scrollbarRef): boolean {
    const { scrollByThumb, scrollByContent } = this.props;

    return (scrollByThumb && scrollbarRef.validateEvent(e))
    || (scrollByContent && this.isContent(e.originalEvent.target));
  }

  prepareDirections(value: boolean): void {
    this.validDirections[DIRECTION_HORIZONTAL] = value;
    this.validDirections[DIRECTION_VERTICAL] = value;
  }

  // eslint-disable-next-line class-methods-use-this
  isContent(element): boolean {
    return isDefined(element.closest('.dx-scrollable-simulated'));
  }

  eventHandler(handler: (scrollbarInstance: any) => dxPromise<void>): dxPromise<void> {
    const { isVertical, isHorizontal } = new ScrollDirection(this.props.direction);
    const deferreds: ReturnType<typeof handler>[] = [];

    if (isVertical) {
      deferreds.push(handler(this.verticalScrollbarRef));
    }
    if (isHorizontal) {
      deferreds.push(handler(this.horizontalScrollbarRef));
    }

    return when.apply($, deferreds).promise();
  }

  private getDirection(e: Event): string | undefined {
    return isDxMouseWheelEvent(e) ? this.wheelDirection(e) : this.allowedDirection();
  }

  private allowedDirection(): string | undefined {
    return updateAllowedDirection(this.allowedDirections(), this.props.direction);
  }

  private allowedDirections(): allowedDirection {
    const { bounceEnabled, direction } = this.props;
    const { isVertical, isHorizontal } = new ScrollDirection(direction);

    return {
      vertical: isVertical
      && (Math.round(this.verticalScrollbarRef.getMinOffset()) < 0 || bounceEnabled),
      horizontal: isHorizontal
      && (Math.round(this.horizontalScrollbarRef.getMinOffset()) < 0 || bounceEnabled),
    };
  }

  containerSize(dimension: string): number {
    return this.getRealDimension(this.containerRef, dimension);
  }

  // eslint-disable-next-line
  getRealDimension(element, dimension): number {
    return Math.round(getBoundingRect(element)[dimension]);
  }

  // eslint-disable-next-line class-methods-use-this
  getBaseDimension(element, dimension): number {
    return element[`offset${titleize(dimension)}`];
  }

  contentSize(dimension: string): number {
    const axis = dimension === 'width' ? 'x' : 'y';

    const overflowStyleName = `overflow${axis.toUpperCase()}`;
    const isOverflowHidden = getElementStyle((overflowStyleName as 'overflowX' | 'overflowY'), this.contentRef) === 'hidden';
    let contentSize = this.getRealDimension(this.contentRef, dimension);

    if (!isOverflowHidden) {
      const containerScrollSize = this.contentRef[`scroll${titleize(dimension)}`] * this.getScaleRatio(dimension);

      contentSize = Math.max(containerScrollSize, contentSize);
    }

    return contentSize;
  }

  getScaleRatio(dimension: string): number {
    let scaleRatio = 1;

    /* istanbul ignore next */
    if (hasWindow()) {
      const realDimension = this.getRealDimension(this.scrollableRef, dimension);
      const baseDimension = this.getBaseDimension(this.scrollableRef, dimension);

      // NOTE: Ratio can be a fractional number,
      // which leads to inaccuracy in the calculation of sizes.
      // We should round it to hundredths in order to reduce
      // the inaccuracy and prevent the unexpected appearance of a scrollbar.
      scaleRatio = Math.round(
        // eslint-disable-next-line no-mixed-operators
        (realDimension / baseDimension * 100),
      ) / 100;
    }

    return scaleRatio;
  }

  private validate(e: Event): boolean {
    if (this.props.disabled) {
      return false;
    }

    if (this.props.bounceEnabled) {
      return true;
    }

    return isDxMouseWheelEvent(e)
      ? this.validateWheel(e)
      : this.validateMove(e);
  }

  // eslint-disable-next-line
  private validateWheel(e: Event): boolean {
    return true; // TODO:
  }

  private validateMove(e: Event): boolean {
    if (!this.props.scrollByContent
      && !isDefined((e.target as HTMLElement).closest(`.${SCROLLABLE_SCROLLBAR_CLASS}`))) {
      return false;
    }

    return isDefined(this.allowedDirection());
  }

  onWidgetKeyDown(options): Event | undefined {
    const { onKeyDown } = this.props;
    const { originalEvent } = options;

    const result = onKeyDown?.(options);
    if (result?.cancel) {
      return result;
    }

    this.keyDownHandler(originalEvent);

    return undefined;
  }

  private keyDownHandler(e: any): void {
    let handled = true;

    switch (normalizeKeyName(e)) {
      case KEY_CODES.DOWN:
        this.scrollByLine({ y: 1 });
        break;
      case KEY_CODES.UP:
        this.scrollByLine({ y: -1 });
        break;
      case KEY_CODES.RIGHT:
        this.scrollByLine({ x: 1 });
        break;
      case KEY_CODES.LEFT:
        this.scrollByLine({ x: -1 });
        break;
      case KEY_CODES.PAGE_DOWN:
        this.scrollByPage(1);
        break;
      case KEY_CODES.PAGE_UP:
        this.scrollByPage(-1);
        break;
      case KEY_CODES.HOME:
        this.scrollToHome();
        break;
      case KEY_CODES.END:
        this.scrollToEnd();
        break;
      default:
        handled = false;
        break;
    }

    if (handled) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  scrollByLine(lines): void {
    const devicePixelRatio = this.tryGetDevicePixelRatio();
    let scrollOffset = SCROLL_LINE_HEIGHT;
    if (devicePixelRatio) {
      // eslint-disable-next-line no-mixed-operators
      scrollOffset = Math.abs(scrollOffset / devicePixelRatio * 100) / 100;
    }
    this.scrollBy({
      top: (lines.y || 0) * scrollOffset,
      left: (lines.x || 0) * scrollOffset,
    });
  }

  /* istanbul ignore next */
  // eslint-disable-next-line class-methods-use-this
  tryGetDevicePixelRatio(): number | undefined {
    if (hasWindow()) {
      return (getWindow() as any).devicePixelRatio;
    }
    return undefined;
  }

  scrollByPage(page): void {
    const prop = this.wheelProp();

    const distance = {};

    if (this.getDimensionByProp(prop) === 'width') {
      distance[prop] = page * getElementWidth(this.containerRef);
    } else {
      distance[prop] = page * getElementHeight(this.containerRef);
    }

    this.scrollBy(distance);
  }

  private wheelProp(): string {
    return (this.wheelDirection() === DIRECTION_HORIZONTAL) ? 'left' : 'top';
  }

  private wheelDirection(e?: any): string {
    switch (this.props.direction) {
      case DIRECTION_HORIZONTAL:
        return DIRECTION_HORIZONTAL;
      case DIRECTION_VERTICAL:
        return DIRECTION_VERTICAL;
      default:
        return e?.shiftKey ? DIRECTION_HORIZONTAL : DIRECTION_VERTICAL;
    }
  }

  scrollToHome(): void {
    const prop = this.wheelProp();
    const distance = {};

    distance[prop] = 0;
    this.scrollTo(distance);
  }

  scrollToEnd(): void {
    const prop = this.wheelProp();
    const distance = {};

    if (this.getDimensionByProp(prop) === 'width') {
      distance[prop] = getElementWidth(this.contentRef) - getElementWidth(this.containerRef);
    } else {
      distance[prop] = getElementHeight(this.contentRef) - getElementHeight(this.containerRef);
    }

    this.scrollTo(distance);
  }

  // eslint-disable-next-line class-methods-use-this
  private getDimensionByProp(prop): string {
    return (prop === 'left') ? 'width' : 'height';
  }

  private isHoverMode(): boolean {
    return this.props.showScrollbar === 'onHover';
  }

  get isScrollbarVisible(): boolean | undefined {
    return this.adjustVisibility();
  }

  adjustVisibility(visible?: boolean): boolean | undefined {
    if (this.baseContainerToContentRatio && !this.needScrollbar) {
      return false;
    }

    switch (this.props.showScrollbar) {
      case 'onScroll':
        break;
      case 'onHover':
        return visible || this.isHovered;
      case 'never':
        return false;
      case 'always':
        return true;
      default:
          // do nothing
    }

    return visible;
  }

  @Effect({ run: 'always' }) effectUpdateScrollbarSize(): void {
    const scrollableOffset = $(this.scrollableRef).offset() || { left: 0, top: 0 };

    this.scaleRatioWidth = this.getScaleRatio('width');
    this.contentWidth = this.contentSize('width');
    this.containerWidth = this.containerSize('width');
    this.scrollableOffsetLeft = scrollableOffset.left;

    this.scaleRatioHeight = this.getScaleRatio('height');
    this.contentHeight = this.contentSize('height');
    this.containerHeight = this.containerSize('height');
    this.scrollableOffsetTop = scrollableOffset.top;
  }

  get needScrollbar(): boolean {
    return this.props.showScrollbar !== 'never' && (this.baseContainerToContentRatio < 1);
  }

  get cssClasses(): string {
    const {
      direction, classes, disabled, showScrollbar,
    } = this.props;

    const classesMap = {
      'dx-scrollable dx-scrollable-renovated': true,
      [SCROLLABLE_SIMULATED_CLASS]: true,
      [`dx-scrollable-${direction}`]: true,
      [SCROLLABLE_DISABLED_CLASS]: !!disabled,
      [SCROLLABLE_SCROLLBARS_ALWAYSVISIBLE]: showScrollbar === 'always',
      [SCROLLABLE_SCROLLBARS_HIDDEN]: !showScrollbar,
      [`${classes}`]: !!classes,
    };
    return combineClasses(classesMap);
  }
}
