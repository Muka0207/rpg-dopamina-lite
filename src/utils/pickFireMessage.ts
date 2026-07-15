import { FIRE_DECK } from "../data/fireDeck";

import type {
  FireMessage,
  FireMessageContext,
  FireMessageTone,
} from "../data/fireDeck";

type PickFireMessageOptions = {
  context: FireMessageContext;
  preferredTones?: FireMessageTone[];
  avoidIds?: string[];
};

export function pickFireMessage({
  context,
  preferredTones = [],
  avoidIds = [],
}: PickFireMessageOptions): FireMessage {
  const byContext = FIRE_DECK.filter((message) => {
    return message.contexts.includes(context) && !avoidIds.includes(message.id);
  });

  const byTone = byContext.filter((message) => {
    if (preferredTones.length === 0) return true;
    return preferredTones.some((tone) => message.tones.includes(tone));
  });

  const finalList =
    byTone.length > 0 ? byTone : byContext.length > 0 ? byContext : FIRE_DECK;

  const randomIndex = Math.floor(Math.random() * finalList.length);

  return finalList[randomIndex];
}