import Emittery from 'emittery';

export type FooterInvalidateEvent = {
  source?: string;
  reason?: string;
};

export type FooterEventMap = {
  invalidate: FooterInvalidateEvent;
};

export type EventService = Emittery<FooterEventMap>;

export function createEventService(): EventService {
  return new Emittery<FooterEventMap>();
}
