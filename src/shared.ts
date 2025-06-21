import type {
  ColorScheme,
  Distance,
  Duration,
  Intensity,
  IntensityValue,
  Numeric,
  ParameterDefinition,
  ParameterValue,
  User,
  Weight,
} from "./db/schema";
import { Duration as LuxonDuration } from "luxon";

export function colorScheme(user?: User): ColorScheme {
  const storedScheme = window.localStorage.getItem("set:theme");
  if (storedScheme) {
    return storedScheme as ColorScheme;
  }
  if (user?.preferredTheme) {
    return user?.preferredTheme;
  }
  return browserColorScheme();
}

export function browserColorScheme() {
  return window?.matchMedia("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

export function saveColorScheme(newScheme: ColorScheme) {
  window.localStorage.setItem("set:theme", newScheme);
}

export function defaultUnit(
  dataType: ParameterDefinition["dataType"],
  user: User
): string | null {
  if (dataType === "weight") {
    return user.preferredUnits?.["weight"] ?? "pound";
  }
  if (dataType === "distance") {
    return user.preferredUnits?.["distance"] ?? "mile";
  }
  return null;
}

export function convertUnit(
  value: number,
  from: string,
  to: string,
  precision: number = 1
): string {
  if (from === to) {
    return Number(value).toFixed(precision);
  }
  if (from === "mile" && to === "km")
    return (value * 1.60934).toFixed(precision);
  if (from === "km" && to === "mile")
    return (value * 0.621371).toFixed(precision);
  if (from === "pound" && to === "kg")
    return (value * 0.453592).toFixed(precision);
  if (from === "kg" && to === "pound")
    return (value * 2.20462).toFixed(precision);
  throw new Error(`Cannot convert ${from} to ${to}.`);
}

export function getRawValue(
  value: ParameterValue | undefined,
  param: ParameterDefinition,
  user: User
): number | IntensityValue | undefined {
  if (!value) return undefined;
  switch (param.dataType) {
    case "duration":
      return (value as Duration)?.value;
    case "number":
      return (value as Numeric)?.value;
    case "distance":
    case "weight":
      const v1 = value as Weight;
      return Number(
        convertUnit(v1.value, v1.unit, defaultUnit(param.dataType, user)!)
      );
    case "intensity":
      return (value as Intensity).value;
    // return (
    //   1 +
    //   allIntensities().findIndex((i) => i.id === (value as Intensity).value)
    // );
    default:
      return undefined;
  }
}

export function displayRawValueForTable(
  value: number | string | undefined,
  param: ParameterDefinition,
  user: User
) {
  const displayValue = typeof value === "number" ? value.toFixed(1) : value;
  const displayUnit = defaultUnit(param.dataType, user);
  return displayValue && displayUnit
    ? displayValue + " " + displayUnit
    : displayValue
    ? displayValue
    : "-";
}

export function displayStringForTable(
  value: ParameterValue,
  param: ParameterDefinition,
  user: User
) {
  const display = displayString(value, param, user);
  return displayRawValueForTable(display.value, param, user);
}

export function displayString(
  value: ParameterValue,
  param: ParameterDefinition,
  user: User
): { value?: string; unit?: string } {
  if (!value?.value && value?.value !== 0) {
    return {};
  }
  switch (param.dataType) {
    case "distance":
      return {
        value: convertUnit(
          (value as Distance).value,
          (value as Distance).unit,
          defaultUnit(param.dataType, user)!
        ),
        unit: defaultUnit(param.dataType, user)!,
      };
    case "weight":
      return {
        value: convertUnit(
          (value as Weight).value,
          (value as Weight).unit,
          defaultUnit(param.dataType, user)!
        ),
        unit: defaultUnit(param.dataType, user)!,
      };
    case "duration":
      return {
        value: durationToString((value as Duration).value),
      };
    case "intensity":
      const display =
        (
          allIntensities().find((i) => i.id === (value as Intensity).value) ||
          {}
        ).name || "";
      return { value: display, unit: undefined };
    case "number":
      return { value: (value as Numeric).value?.toString(), unit: undefined };
    default:
      throw new Error("Invalid dataType");
  }
}

export function durationToString(value: number) {
  return LuxonDuration.fromMillis(value)
    .shiftTo("minutes", "seconds")
    .normalize()
    .toHuman({
      unitDisplay: "narrow",
      listStyle: "narrow",
    });
}

export function allUnits() {
  return [
    { name: "Miles", id: "mile", type: "distance", short: "mi" },
    { name: "Pounds", id: "pound", type: "weight", short: "lb" },
    { name: "Kilometers", id: "km", type: "distance", short: "km" },
    { name: "Kilograms", id: "kg", type: "weight", short: "kg" },
  ] as const;
}

export function allParameters(): ParameterDefinition[] {
  return [
    {
      id: "reps",
      name: "Reps",
      dataType: "number",
    },
    {
      id: "weight",
      name: "Weight",
      dataType: "weight",
    },
    {
      id: "assisted",
      name: "Assisted",
      dataType: "weight",
    },
    {
      id: "distance",
      name: "Distance",
      dataType: "distance",
    },
    {
      id: "duration",
      name: "Duration",
      dataType: "duration",
    },
    {
      id: "intensity",
      name: "Intensity",
      dataType: "intensity",
    },
  ] as const;
}

export function allIntensities() {
  return [
    { id: "low", name: "Low" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High" },
  ] as const;
}

export function allColorSchemes() {
  return [
    { id: "light", name: "Light" },
    { id: "dark", name: "Dark" },
  ];
}
