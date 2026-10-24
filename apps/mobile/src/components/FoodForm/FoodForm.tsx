import Ionicons from '@expo/vector-icons/Ionicons';
import { MenuView } from '@expo/ui/community/menu';
import {
  type Micronutrient,
  type NutrientAmount,
  type NutritionFacts,
  type Tag,
  type Unit,
} from '@bitebook/domain';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import {
  foodMicronutrientFields,
  foodNutrientFields,
  foodServingUnits,
} from '~/constants';
import type { FoodFormValues, TagPickerValue } from '~/models';
import { useThemeColors } from '~/theme';

import { TagPicker } from '../TagPicker/TagPicker';
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

function isNameInvalid(value: string) {
  return value.trim().length === 0;
}

function isServingAmountInvalid(value: string) {
  return parseNumber(value, true) === undefined;
}

function isCaloriesInvalid(value: string) {
  return parseNumber(value) === undefined;
}

function normalizeServingAmount(value: string) {
  const withoutLeadingZeros = value.replace(/^0+(?=\d)/, '');
  return Number(withoutLeadingZeros) === 0 ? '' : withoutLeadingZeros;
}

/** Collects and validates the complete manual Food input. */
export function FoodForm({
  availableTags,
  error,
  isSubmitting,
  onSubmit,
}: FoodFormProps) {
  const colors = useThemeColors();
  const caloriesTextInputRef = useRef<TextInputInstance>(null);
  const nameTextInputRef = useRef<TextInputInstance>(null);
  const servingAmountTextInputRef = useRef<TextInputInstance>(null);
  const [name, setName] = useState('');
  const [servingAmount, setServingAmount] = useState('');
  const [servingUnit, setServingUnit] = useState<Unit>('g');
  const [calories, setCalories] = useState('');
  const [nutrients, setNutrients] = useState<Partial<Record<NutrientField, string>>>({});
  const [micronutrients, setMicronutrients] = useState<
    Partial<Record<Micronutrient, string>>
  >({});
  const [showMoreNutrition, setShowMoreNutrition] = useState(false);
  const [tags, setTags] = useState<TagPickerValue>({ newTags: [], tagIds: [] });
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasNameError, setHasNameError] = useState(false);
  const [hasServingAmountError, setHasServingAmountError] = useState(false);
  const [hasCaloriesError, setHasCaloriesError] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const selectedServingUnit = foodServingUnits.find(
    ({ id }) => id === servingUnit,
  );

  function blurServingAmount() {
    setHasServingAmountError(isServingAmountInvalid(servingAmount));
    setServingAmount(normalizeServingAmount(servingAmount));
  }

  async function submit() {
    const parsedServingAmount = parseNumber(servingAmount, true);
    const parsedCalories = parseNumber(calories);
    const invalidOptionalNutrition = [
      ...foodNutrientFields.map(({ id }) => nutrients[id]),
      ...foodMicronutrientFields.map(({ id }) => micronutrients[id]),
    ].some((value) => value !== undefined && parseNumber(value) === undefined);

    const nameInvalid = isNameInvalid(name);
    const servingAmountInvalid = parsedServingAmount === undefined;
    const caloriesInvalid = parsedCalories === undefined;
    setHasNameError(nameInvalid);
    setHasServingAmountError(servingAmountInvalid);
    setHasCaloriesError(caloriesInvalid);

    if (nameInvalid || servingAmountInvalid || caloriesInvalid) {
      setValidationError(undefined);
      if (nameInvalid) nameTextInputRef.current?.focus();
      else if (servingAmountInvalid) servingAmountTextInputRef.current?.focus();
      else caloriesTextInputRef.current?.focus();
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
      tagIds: tags.tagIds.length > 0 ? tags.tagIds : undefined,
      newTags: tags.newTags.length > 0 ? tags.newTags : undefined,
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
          <View style={styles.field}>
            <TextInput
              accessibilityLabel="Food name, required"
              autoCapitalize="words"
              maxLength={100}
              onBlur={() => setHasNameError(isNameInvalid(name))}
              onChangeText={setName}
              onSubmitEditing={() => servingAmountTextInputRef.current?.focus()}
              placeholder="Food name"
              ref={nameTextInputRef}
              returnKeyType="next"
              submitBehavior="submit"
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: hasNameError ? colors.danger : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              testID="food-form-name-input"
              value={name}
            />
            {hasNameError ? (
              <Text
                accessibilityRole="alert"
                style={[styles.fieldError, { color: colors.danger }]}
                testID="food-form-name-error"
              >
                Enter a food name
              </Text>
            ) : null}
          </View>
          <View style={styles.field}>
            <View style={styles.row}>
              <TextInput
                accessibilityLabel="Serving amount, required"
                keyboardType="decimal-pad"
                onBlur={blurServingAmount}
                onChangeText={setServingAmount}
                placeholder="Amount"
                ref={servingAmountTextInputRef}
                style={[
                  styles.input,
                  styles.flex,
                  {
                    backgroundColor: colors.background,
                    borderColor: hasServingAmountError ? colors.danger : colors.border,
                    color: colors.textPrimary,
                  },
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
            {hasServingAmountError ? (
              <Text
                accessibilityRole="alert"
                style={[styles.fieldError, { color: colors.danger }]}
                testID="food-form-serving-amount-error"
              >
                Enter a serving amount greater than 0
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.textSecondary }]}
            testID="food-form-nutrition-heading"
          >
            NUTRITION
          </Text>
          <View style={styles.field}>
            <View style={styles.numberField}>
              <TextInput
                accessibilityLabel="Calories, required"
                keyboardType="decimal-pad"
                onBlur={() => setHasCaloriesError(isCaloriesInvalid(calories))}
                onChangeText={setCalories}
                placeholder="Calories"
                ref={caloriesTextInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: hasCaloriesError ? colors.danger : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                testID="food-form-calories-input"
                value={calories}
              />
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>kcal</Text>
            </View>
            {hasCaloriesError ? (
              <Text
                accessibilityRole="alert"
                style={[styles.fieldError, { color: colors.danger }]}
                testID="food-form-calories-error"
              >
                Enter calories of 0 or greater
              </Text>
            ) : null}
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
          <TagPicker
            availableTags={availableTags}
            itemName="Food"
            onChange={setTags}
            testIDPrefix="food-form"
            value={tags}
          />
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
