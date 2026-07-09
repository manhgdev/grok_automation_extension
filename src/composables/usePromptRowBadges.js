export function usePromptRowBadges(characterControlRef, voiceControlRef) {
  function getRowBadge(index) {
    return voiceControlRef.value?.getSpeakerRowBadge?.(index) ?? null;
  }

  function getExtraRowBadges(index) {
    const badge = characterControlRef.value?.getCharacterRowBadge?.(index);
    return badge ? [badge] : [];
  }

  function getSpeaker(index) {
    return voiceControlRef.value?.getPayloadSpeaker?.(index) ?? null;
  }

  function getCharacters(index) {
    return characterControlRef.value?.getPayloadCharacters?.(index) ?? null;
  }

  return { getRowBadge, getExtraRowBadges, getSpeaker, getCharacters };
}
