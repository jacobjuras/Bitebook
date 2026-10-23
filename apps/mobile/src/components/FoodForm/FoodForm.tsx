import Ionicons from '@expo/vector-icons/Ionicons';
import { MenuView } from '@expo/ui/community/menu';
import {
  normalizeTagName,
  type Micronutrient,
  type NutrientAmount,
  type NutritionFacts,
  type Tag,
  type Unit,
} from '@bitebook/domain';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  foodMicronutrientFields,
  foodNutrientFields,
  foodServingUnits,
} from '~/constants';
import type { FoodFormValues } from '~/models';
import { useThemeColors } from '~/theme';

import { ClearAllButton } from '../ClearAllButton/ClearAllButton';
import { styles } from './styles';

type NutrientField = (typeof foodNutrientFields)[number]['id'];

type FoodFormProps = {
  availableTags: readonly Tag[];
  error?: string;
  isSubmitting: boolean;
  onSubmit: (food: FoodFormValues) => Promise<void> | void;
};

function parseNumber(value: string, mustBePositive = false) {
  if (value.trim().length === 0) return undefined;
  const number = Number(value);
  return Number.isFinite(number)
    && (mustBePositive ? number > 0 : number >= 0)
    ? number
    : undefined;
}

/** Collects and validates the complete manual Food input. */
export function FoodForm({
  availableTags,
  error,
  isSubmitting,
  onSubmit,
}: FoodFormProps) {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [servingAmount, setServingAmount] = useState('');
  const [servingUnit, setServingUnit] = useState<Unit>('g');
  const [calories, setCalories] = useState('');
  const [nutrients, setNutrients] = useState<Partial<Record<NutrientField, string>>>({});
  const [micronutrients, setMicronutrients] = useState<
    Partial<Record<Micronutrient, string>>
  >({});
  const [showMoreNutrition, setShowMoreNutrition] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<{ name: string }[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [tagError, setTagError] = useState<string>();
  const selectedServingUnit = foodServingUnits.find(
    ({ id }) => id === servingUnit,
  );
  const normalizedTagInput = normalizeTagName(tagInput);
  const selectedTags = selectedTagIds.flatMap((tagId) => {
    const tag = availableTags.find(({ id }) => id === tagId);
    return tag ? [tag] : [];
  });
  const unselectedTags = availableTags.filter(
    ({ id }) => !selectedTagIds.includes(id),
  );
  const matchingTags = normalizedTagInput
    ? unselectedTags.filter(({ normalizedName }) =>
      normalizedName.includes(normalizedTagInput),
    )
    : unselectedTags;
  const selectableTags = matchingTags.length > 0 ? matchingTags : unselectedTags;

  function showTagError(message: string) {
    Keyboard.dismiss();
    setTagError(message);
  }

  function hasTagCapacity() {
    if (selectedTagIds.length + newTags.length < 10) return true;
    showTagError('Foods can have up to 10 tags');
    return false;
  }

  function showTagInput() {
    if (!hasTagCapacity()) return;
    setIsAddingTag(true);
  }

  function cancelTag() {
    setTagInput('');
    setTagError(undefined);
    setIsAddingTag(false);
  }

  function selectExistingTag(tag: Tag) {
    if (!hasTagCapacity()) return;
    setSelectedTagIds((currentTagIds) => [...currentTagIds, tag.id]);
    cancelTag();
  }

  function addNewTag() {
    const name = tagInput.trim();
    const normalizedName = normalizeTagName(name);
    if (!normalizedName) return;
    if (normalizedName === 'favorite' || normalizedName === 'favorites') {
      showTagError('Favorite is reserved for the favorite toggle');
      return;
    }

    const existingTag = availableTags.find(
      (tag) => tag.normalizedName === normalizedName,
    );
    if (existingTag) {
      showTagError(selectedTagIds.includes(existingTag.id)
        ? 'Tag already added'
        : 'This tag already exists. Select it above.');
      return;
    }
    if (newTags.some((tag) => normalizeTagName(tag.name) === normalizedName)) {
      showTagError('Tag already added');
      return;
    }
    if (!hasTagCapacity()) return;

    setNewTags((currentTags) => [...currentTags, { name }]);
    cancelTag();
  }

  function clearTags() {
    setSelectedTagIds([]);
    setNewTags([]);
    setTagError(undefined);
  }

  function removeExistingTag(tagId: string) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.filter((currentTagId) => currentTagId !== tagId),
    );
    setTagError(undefined);
  }

  function removeNewTag(name: string) {
    const normalizedName = normalizeTagName(name);
    setNewTags((currentTags) => currentTags.filter(
      (tag) => normalizeTagName(tag.name) !== normalizedName,
    ));
    setTagError(undefined);
  }

  async function submit() {
    const parsedServingAmount = parseNumber(servingAmount, true);
    const parsedCalories = parseNumber(calories);
    const invalidOptionalNutrition = [
      ...foodNutrientFields.map(({ id }) => nutrients[id]),
      ...foodMicronutrientFields.map(({ id }) => micronutrients[id]),
    ].some((value) => value !== undefined && parseNumber(value) === undefined);

    if (!name.trim() || parsedServingAmount === undefined || parsedCalories === undefined) {
      setValidationError('Enter a name, positive serving size, and valid calories');
      return;
    }
    if (invalidOptionalNutrition) {
      setValidationError('Nutrition values must be zero or greater');
      return;
    }

    const optionalNutrition = Object.fromEntries(
      foodNutrientFields.flatMap(({ id }) => {
        const value = nutrients[id];
        const parsedValue = value === undefined ? undefined : parseNumber(value);
        return parsedValue === undefined ? [] : [[id, parsedValue]];
      }),
    ) as Partial<Omit<NutritionFacts, 'caloriesKcal' | 'micronutrients'>>;
    const parsedMicronutrients = Object.fromEntries(
      foodMicronutrientFields.flatMap(({ id, unit }) => {
        const value = micronutrients[id];
        const amount = value === undefined ? undefined : parseNumber(value);
        return amount === undefined ? [] : [[id, { amount, unit }]];
      }),
    ) as Partial<Record<Micronutrient, NutrientAmount>>;

    setValidationError(undefined);
    await onSubmit({
      isFavorite,
      name: name.trim(),
      nutritionFacts: {
        caloriesKcal: parsedCalories,
        micronutrients: parsedMicronutrients,
        ...optionalNutrition,
      },
      servingSize: { amount: parsedServingAmount, unit: servingUnit },
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      newTags: newTags.length > 0 ? newTags : undefined,
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
      testID="food-form-keyboard-avoiding-view"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        style={[styles.screen, { backgroundColor: colors.background }]}
        testID="food-form-scroll-view"
      >
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          testID="food-form-title"
        >
          Add food
        </Text>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BASICS</Text>
          <TextInput
            accessibilityLabel="Food name, required"
            autoCapitalize="words"
            maxLength={100}
            onChangeText={setName}
            placeholder="Food name"
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary },
            ]}
            testID="food-form-name-input"
            value={name}
          />
          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Serving amount, required"
              keyboardType="decimal-pad"
              onChangeText={setServingAmount}
              placeholder="Amount"
              style={[
                styles.input,
                styles.flex,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary },
              ]}
              testID="food-form-serving-amount-input"
              value={servingAmount}
            />
            <MenuView
              actions={foodServingUnits.map(({ id, label }) => ({ id, title: label }))}
              onPressAction={({ nativeEvent }) => setServingUnit(nativeEvent.event as Unit)}
              testID="food-form-serving-unit-menu"
            >
              <View
                accessibilityLabel={`Serving unit, ${selectedServingUnit?.label}`}
                accessibilityRole="button"
                style={[
                  styles.unitButton,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                testID="food-form-serving-unit-button"
              >
                <Text style={{ color: colors.textPrimary }}>{selectedServingUnit?.label}</Text>
                <Ionicons color={colors.textSecondary} name="chevron-down" size={16} />
              </View>
            </MenuView>
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.textSecondary }]}
            testID="food-form-nutrition-heading"
          >
            NUTRITION
          </Text>
          <View style={styles.numberField}>
            <TextInput
              accessibilityLabel="Calories, required"
              keyboardType="decimal-pad"
              onChangeText={setCalories}
              placeholder="Calories"
              style={[
                styles.input,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary },
              ]}
              testID="food-form-calories-input"
              value={calories}
            />
            <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>kcal</Text>
          </View>
          {showMoreNutrition ? (
            <View style={styles.optionalNutrition} testID="food-form-optional-nutrition">
              {foodNutrientFields.map(({ id, label, unit }) => (
                <View key={id} style={styles.numberField}>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={(value) => setNutrients((current) => ({ ...current, [id]: value }))}
                    placeholder={label}
                    style={[
                      styles.input,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary },
                    ]}
                    testID={`food-form-${id}-input`}
                    value={nutrients[id] ?? ''}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{unit}</Text>
                </View>
              ))}
              {foodMicronutrientFields.map(({ id, label, unit }) => (
                <View key={id} style={styles.numberField}>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={(value) => setMicronutrients((current) => ({ ...current, [id]: value }))}
                    placeholder={label}
                    style={[
                      styles.input,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary },
                    ]}
                    testID={`food-form-${id}-input`}
                    value={micronutrients[id] ?? ''}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{unit}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowMoreNutrition((visible) => !visible)}
            style={styles.linkButton}
            testID="food-form-more-nutrition-button"
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>
              {showMoreNutrition ? 'Hide optional nutrition fields' : 'Add more nutrition fields'}
            </Text>
            <Ionicons
              color={colors.accent}
              name={showMoreNutrition ? 'chevron-up' : 'chevron-forward'}
              size={16}
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.textSecondary }]}
            testID="food-form-tag-heading"
          >
            TAGS
          </Text>
          <View style={styles.tags} testID="food-form-tags">
            {selectedTags.map((tag) => (
              <Pressable
                accessibilityLabel={`Remove ${tag.name} tag`}
                accessibilityRole="button"
                key={tag.id}
                onPress={() => removeExistingTag(tag.id)}
                style={[styles.tagChip, { backgroundColor: colors.accentSubtle }]}
                testID={`food-form-selected-tag-${tag.id}`}
              >
                <Text style={{ color: colors.textPrimary }}>{tag.name}</Text>
                <Ionicons color={colors.textSecondary} name="close" size={14} />
              </Pressable>
            ))}
            {newTags.map(({ name: tagName }) => {
              const normalizedName = normalizeTagName(tagName);
              return (
                <Pressable
                  accessibilityLabel={`Remove new ${tagName} tag`}
                  accessibilityRole="button"
                  key={normalizedName}
                  onPress={() => removeNewTag(tagName)}
                  style={[
                    styles.tagChip,
                    styles.newTagChip,
                    { borderColor: colors.accent },
                  ]}
                  testID={`food-form-new-tag-${normalizedName}`}
                >
                  <Ionicons
                    color={colors.accent}
                    name="add"
                    size={14}
                    testID={`food-form-new-tag-${normalizedName}-indicator`}
                  />
                  <Text style={{ color: colors.textPrimary }}>{tagName}</Text>
                  <Ionicons color={colors.textSecondary} name="close" size={14} />
                </Pressable>
              );
            })}
            {selectableTags.map((tag) => (
              <Pressable
                accessibilityLabel={`Select ${tag.name} tag`}
                accessibilityRole="button"
                key={tag.id}
                onPress={() => selectExistingTag(tag)}
                style={({ pressed }) => [
                  styles.availableTagChip,
                  { borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
                testID={`food-form-available-tag-${tag.id}`}
              >
                <Text style={{ color: colors.textPrimary }}>{tag.name}</Text>
              </Pressable>
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
                testID="food-form-show-tag-input-button"
              >
                <Text style={{ color: colors.textPrimary }}>+ Tag</Text>
              </Pressable>
            ) : null}
            {selectedTagIds.length + newTags.length > 0 ? (
              <ClearAllButton
                accessibilityLabel="Clear all Food tags"
                onPress={clearTags}
                testID="food-form-clear-tags-button"
              />
            ) : null}
          </View>
          {isAddingTag ? (
            <View style={styles.row} testID="food-form-tag-editor">
              <View
                style={[
                  styles.tagInputContainer,
                  styles.flex,
                  {
                    backgroundColor: colors.background,
                    borderColor: tagError ? colors.danger : colors.border,
                  },
                ]}
                testID="food-form-tag-input-container"
              >
                <TextInput
                  accessibilityLabel="Optional tag"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  maxLength={30}
                  onChangeText={(value) => {
                    setTagInput(value);
                    setTagError(undefined);
                  }}
                  onSubmitEditing={addNewTag}
                  placeholder="Tag name"
                  returnKeyType="done"
                  style={[styles.tagInput, { color: colors.textPrimary }]}
                  testID="food-form-tag-input"
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
                  testID="food-form-cancel-tag-button"
                >
                  <Ionicons
                    color={colors.textSecondary}
                    name="close-circle"
                    size={20}
                  />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={addNewTag}
                style={({ pressed }) => [
                  styles.tagButton,
                  { borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
                testID="food-form-add-tag-button"
              >
                <Text style={{ color: colors.accent }}>Add</Text>
              </Pressable>
            </View>
          ) : null}
          {tagError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }} testID="food-form-tag-error">
              {tagError}
            </Text>
          ) : null}
          <View style={styles.favoriteRow}>
            <Text
              style={[styles.favoriteLabel, { color: colors.textPrimary }]}
              testID="food-form-favorite-label"
            >
              Add to favorites
            </Text>
            <Switch
              accessibilityLabel="Add Food to favorites"
              onValueChange={setIsFavorite}
              testID="food-form-favorite-switch"
              trackColor={{ false: colors.border, true: colors.accent }}
              value={isFavorite}
            />
          </View>
        </View>

        {validationError || error ? (
          <View style={[styles.error, { backgroundColor: colors.dangerSubtle }]}>
            <Text accessibilityRole="alert" style={{ color: colors.danger }} testID="food-form-error">
              {validationError ?? error}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.accent },
            (pressed || isSubmitting) && styles.pressed,
          ]}
          testID="food-form-save-button"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.onAccent} testID="food-form-saving-indicator" />
          ) : (
            <Text style={[styles.saveText, { color: colors.onAccent }]}>Save food</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
