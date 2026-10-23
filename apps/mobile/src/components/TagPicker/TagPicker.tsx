import Ionicons from '@expo/vector-icons/Ionicons';
import { normalizeTagName, type Tag } from '@bitebook/domain';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import {
  TAG_INPUT_CHIP_MAX_WIDTH,
  TAG_INPUT_CHIP_MIN_WIDTH,
  TAG_PICKER_MAX_TAGS,
  TagChipVariant,
} from '~/constants';
import type { TagPickerValue } from '~/models';
import { useThemeColors } from '~/theme';
import {
  getSelectableTags,
  getSelectedTags,
  hasTagCapacity,
  resolveTagInput,
} from '~/utils';

import { ClearAllButton } from '../ClearAllButton/ClearAllButton';
import { TagChip } from '../TagChip/TagChip';
import { styles } from './styles';

/** Selects existing Tags and stages new Tags for an atomic item submission. */
export function TagPicker({
  availableTags,
  itemName,
  onChange,
  testIDPrefix,
  value,
}: {
  availableTags: readonly Tag[];
  itemName: string;
  onChange: (value: TagPickerValue) => void;
  testIDPrefix: string;
  value: TagPickerValue;
}) {
  const colors = useThemeColors();
  const preserveEditorOnBlurRef = useRef(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagInputWidth, setTagInputWidth] = useState(TAG_INPUT_CHIP_MIN_WIDTH);
  const [tagError, setTagError] = useState<string>();
  const selectedTags = getSelectedTags(availableTags, value.tagIds);
  const selectableTags = getSelectableTags(
    availableTags,
    value.tagIds,
    tagInput,
  );

  function showTagError(message: string) {
    preserveEditorOnBlurRef.current = isAddingTag;
    Keyboard.dismiss();
    setTagError(message);
  }

  function ensureTagCapacity() {
    if (hasTagCapacity(value)) return true;
    showTagError(`${itemName}s can have up to ${TAG_PICKER_MAX_TAGS} tags`);
    return false;
  }

  function cancelTag() {
    preserveEditorOnBlurRef.current = false;
    setTagInput('');
    setTagInputWidth(TAG_INPUT_CHIP_MIN_WIDTH);
    setTagError(undefined);
    setIsAddingTag(false);
  }

  function showTagInput() {
    if (ensureTagCapacity()) setIsAddingTag(true);
  }

  function handleTagInputBlur() {
    if (preserveEditorOnBlurRef.current) {
      preserveEditorOnBlurRef.current = false;
      return;
    }
    cancelTag();
  }

  function selectExistingTag(tag: Tag) {
    if (!ensureTagCapacity()) return;
    onChange({ ...value, tagIds: [...value.tagIds, tag.id] });
    cancelTag();
  }

  function addNewTag() {
    const resolution = resolveTagInput(tagInput, availableTags, value);
    switch (resolution.kind) {
      case 'empty':
        return;
      case 'reserved':
        showTagError('Favorite is reserved for the favorite toggle');
        return;
      case 'duplicate':
        showTagError('Tag already added');
        return;
      case 'limit':
        showTagError(`${itemName}s can have up to ${TAG_PICKER_MAX_TAGS} tags`);
        return;
      case 'existing':
        selectExistingTag(resolution.tag);
        return;
      case 'new':
        onChange({ ...value, newTags: [...value.newTags, resolution.tag] });
        cancelTag();
        return;
      default:
        resolution satisfies never;
    }
  }

  function clearTags() {
    onChange({ newTags: [], tagIds: [] });
    setTagError(undefined);
  }

  return (
    <View style={styles.container} testID={`${testIDPrefix}-tag-picker`}>
      <Text
        style={[styles.sectionLabel, { color: colors.textSecondary }]}
        testID={`${testIDPrefix}-tag-heading`}
      >
        TAGS
      </Text>
      <View style={styles.tags} testID={`${testIDPrefix}-tags`}>
        {selectedTags.map((tag) => (
          <TagChip
            accessibilityLabel={`Remove ${tag.name} tag`}
            id={tag.id}
            key={tag.id}
            label={tag.name}
            onPress={() => {
              onChange({
                ...value,
                tagIds: value.tagIds.filter((tagId) => tagId !== tag.id),
              });
              setTagError(undefined);
            }}
            testIDPrefix={`${testIDPrefix}-selected-tag`}
            variant={TagChipVariant.Selected}
          />
        ))}
        {value.newTags.map(({ name }) => {
          const normalizedName = normalizeTagName(name);
          return (
            <TagChip
              accessibilityLabel={`Remove new ${name} tag`}
              id={normalizedName}
              key={normalizedName}
              label={name}
              onPress={() => {
                onChange({
                  ...value,
                  newTags: value.newTags.filter(
                    (tag) => normalizeTagName(tag.name) !== normalizedName,
                  ),
                });
                setTagError(undefined);
              }}
              testIDPrefix={`${testIDPrefix}-new-tag`}
              variant={TagChipVariant.Pending}
            />
          );
        })}
        {selectableTags.map((tag) => (
          <TagChip
            accessibilityLabel={`Select ${tag.name} tag`}
            id={tag.id}
            key={tag.id}
            label={tag.name}
            onPress={() => selectExistingTag(tag)}
            testIDPrefix={`${testIDPrefix}-available-tag`}
            variant={TagChipVariant.Available}
          />
        ))}
        {!isAddingTag ? (
          <Pressable
            accessibilityLabel="Add optional tag"
            accessibilityRole="button"
            onPress={showTagInput}
            style={({ pressed }) => [
              styles.addTagChip,
              { borderColor: colors.border },
              pressed && styles.pressed,
            ]}
            testID={`${testIDPrefix}-show-tag-input-button`}
          >
            <Text style={{ color: colors.textPrimary }}>+ Tag</Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.tagInputChip,
              {
                backgroundColor: colors.background,
                borderColor: tagError ? colors.danger : colors.border,
              },
            ]}
            testID={`${testIDPrefix}-tag-input-container`}
          >
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onLayout={({ nativeEvent }) => {
                setTagInputWidth(Math.min(
                  TAG_INPUT_CHIP_MAX_WIDTH,
                  Math.max(
                    TAG_INPUT_CHIP_MIN_WIDTH,
                    Math.ceil(nativeEvent.layout.width) + 4,
                  ),
                ));
              }}
              pointerEvents="none"
              style={styles.tagInputMeasurement}
              testID={`${testIDPrefix}-tag-input-measurement`}
            >
              {tagInput || 'Tag name'}
            </Text>
            <TextInput
              accessibilityLabel="Optional tag"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={30}
              onBlur={handleTagInputBlur}
              onChangeText={(input) => {
                setTagInput(input);
                setTagError(undefined);
              }}
              onSubmitEditing={addNewTag}
              placeholder="Tag name"
              returnKeyType="done"
              style={[
                styles.tagChipInput,
                { color: colors.textPrimary, width: tagInputWidth },
              ]}
              testID={`${testIDPrefix}-tag-input`}
              value={tagInput}
            />
            <Pressable
              accessibilityLabel="Cancel tag entry"
              accessibilityRole="button"
              hitSlop={8}
              onPress={cancelTag}
              style={({ pressed }) => [
                styles.cancelTagButton,
                pressed && styles.pressed,
              ]}
              testID={`${testIDPrefix}-cancel-tag-button`}
            >
              <Ionicons color={colors.textSecondary} name="close" size={14} />
            </Pressable>
          </View>
        )}
        {value.tagIds.length + value.newTags.length > 0 ? (
          <ClearAllButton
            accessibilityLabel="Clear all tags"
            onPress={clearTags}
            testID={`${testIDPrefix}-clear-tags-button`}
          />
        ) : null}
      </View>
      {tagError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger }}
          testID={`${testIDPrefix}-tag-error`}
        >
          {tagError}
        </Text>
      ) : null}
    </View>
  );
}
