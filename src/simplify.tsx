import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { List } from "@raycast/api";

/**
 * Utilities for converting fraction strings in the format "a/b" to various representations
 */

/**
 * Validates if the input is a fraction string in the format "a/b"
 * @param fractionStr String to validate
 * @returns True if the string is a valid fraction format
 */
function isValidFractionStr(fractionStr: string): boolean {
  const fractionRegex = /^-?\d+\/-?[1-9]\d*$/;
  return fractionRegex.test(fractionStr);
}
function isValidDecimalStr(decimalStr: string): boolean {
  const decimalRegex = /^\d+\.(\d+\.\.\.|(\d+\(\d+\))|(\(\d+\))|\d+)$/;
  return decimalRegex.test(decimalStr);
}

/**
 * Parses a fraction string into its numerator and denominator
 * @param fractionStr Fraction string in the format "a/b"
 * @returns An object with numerator and denominator
 */
function parseFraction(fractionStr: string): { numerator: number, denominator: number } {
  if (!isValidFractionStr(fractionStr)) {
    throw new Error("Invalid fraction format. Expected format: 'a/b'");
  }

  const [numeratorStr, denominatorStr] = fractionStr.split('/');
  const numerator = parseInt(numeratorStr, 10);
  const denominator = parseInt(denominatorStr, 10);

  if (denominator === 0) {
    throw new Error("Division by zero: denominator cannot be zero");
  }

  return { numerator, denominator };
}

/**
 * Calculates the greatest common divisor (GCD) of two numbers
 * @param a First number
 * @param b Second number
 * @returns The GCD of a and b
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}



/**
 * Simplifies a fraction string to its lowest terms
 * @param fractionStr Fraction string in the format "a/b"
 * @returns A new fraction string in simplified form
 */
function toSimplified(fractionStr: string): string {
  let { numerator, denominator } = parseFraction(fractionStr);

  // Handle negative signs
  const isNegative = (numerator < 0) !== (denominator < 0);
  numerator = Math.abs(numerator);
  denominator = Math.abs(denominator);

  const divisor = gcd(numerator, denominator);

  numerator = numerator / divisor;
  denominator = denominator / divisor;

  return `${isNegative ? '-' : ''}${numerator}/${denominator}`;
}

/**
 * Converts a fraction string to scientific notation
 * @param fractionStr Fraction string in the format "a/b"
 * @param precision Number of decimal places (default: 10)
 * @returns The fraction in scientific notation
 */
function toScientific(fractionStr: string, precision: number = 10): string {
  const frac = parseFraction(fractionStr);
  const decimalValue = frac.numerator / frac.denominator;
  return decimalValue.toExponential(precision);
}

/**
 * Converts a fraction string to mixed number format (integer + proper fraction)
 * @param fractionStr Fraction string in the format "a/b"
 * @returns A string in mixed number format "i + n/d" or just "n/d" for proper fractions
 */
function toMixed(fractionStr: string): string {
  let { numerator, denominator } = parseFraction(fractionStr);

  // Handle negative signs
  const isNegative = (numerator < 0) !== (denominator < 0);
  numerator = Math.abs(numerator);
  denominator = Math.abs(denominator);

  // Simplify the fraction
  const divisor = gcd(numerator, denominator);
  numerator = numerator / divisor;
  denominator = denominator / divisor;

  // If fraction is already proper (numerator < denominator), just return the simplified form
  if (numerator < denominator) {
    return `${isNegative ? '-' : ''}${numerator}/${denominator}`;
  }

  // Calculate the integer part and the remainder
  const integerPart = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;

  // If the remainder is zero, just return the integer part
  if (remainder === 0) {
    return `${isNegative ? '-' : ''}${integerPart}`;
  }

  // Return the mixed number format
  return `${isNegative ? '-' : ''}${integerPart} + ${remainder}/${denominator}`;
}

function toDecimal(fractionStr: string): { decimal: string, period: number } {
  const { numerator, denominator } = parseFraction(fractionStr);

  if (numerator === 0) {
    return { decimal: "0", period: 0 };
  }

  if (numerator % denominator === 0) {
    return { decimal: (numerator / denominator).toString(), period: 0 };
  }

  const isNegative = (numerator < 0) !== (denominator < 0);
  const absNumerator = Math.abs(numerator);
  const absDenominator = Math.abs(denominator);
  const integerPart = Math.floor(absNumerator / absDenominator);

  let remainder = absNumerator % absDenominator;
  let decimalPart = "";
  const remaindersSeen = new Map();

  while (remainder !== 0 && !remaindersSeen.has(remainder)) {
    remaindersSeen.set(remainder, decimalPart.length);
    remainder *= 10;
    decimalPart += Math.floor(remainder / absDenominator).toString();
    remainder %= absDenominator;
  }

  if (remainder === 0) {
    return {
      decimal: `${isNegative ? '-' : ''}${integerPart}${decimalPart.length > 0 ? '.' + decimalPart : ''}`,
      period: 0
    };
  }

  const repeatStart = remaindersSeen.get(remainder);
  const nonRepeatingPart = decimalPart.substring(0, repeatStart);
  const repeatingPart = decimalPart.substring(repeatStart);
  const period = repeatingPart.length;

  return {
    decimal: `${isNegative ? '-' : ''}${integerPart}.${nonRepeatingPart}(${repeatingPart})`,
    period: period
  };
}


function decimalToFraction(input: number | string): { num: bigint | null; den: bigint | null } {
  if (typeof input === "number") {
    const str = input.toString();
    const parts = str.split(".");
    if (parts.length === 1) return { num: BigInt(parts[0]), den: 1n };
    const numerator = BigInt(str.replace(".", ""));
    const denominator = BigInt("1" + "0".repeat(parts[1].length));
    const gcdVal = biggcd(numerator, denominator);
    return {
      num: numerator / gcdVal,
      den: denominator / gcdVal,
    };
  }

  if (typeof input === "string") {
    let match: RegExpMatchArray | null;
    // Pattern: Repeating in parentheses (e.g., 0.(3), 2.1(6), etc.)
    if ((match = input.match(/^(\d*)\.(\d*)\((\d+)\)$/))) {
      const [_, intPart, nonRepeat, repeat] = match;
      const nonRepeatLen = nonRepeat.length;
      const repeatLen = repeat.length;

      const base = intPart + nonRepeat + repeat;
      const noRepeat = intPart + nonRepeat;

      const numerator = BigInt(base) - BigInt(noRepeat || 0);
      const denominator = BigInt("9".repeat(repeatLen) + "0".repeat(nonRepeatLen));

      return reduceFraction(numerator, denominator);
    }

    // Pattern: Repeating with ellipsis (e.g., 0.3..., 0.333..., etc.)
    if ((match = input.match(/^(\d*)\.(\d+)\.\.\.$/))) {
      const [_, intPart, repeatingPart] = match;
      const repeatLen = repeatingPart.length;

      const numerator = BigInt(intPart + repeatingPart) - BigInt(intPart || 0);
      const denominator = BigInt("9".repeat(repeatLen));

      return reduceFraction(numerator, denominator);
    }

    // Regular decimal string (e.g., "0.3", "2.142857")
    if ((match = input.match(/^(\d*)\.(\d+)$/))) {
      const [_, intPart, fractionPart] = match;
      const numerator = BigInt(intPart + fractionPart);
      const denominator = BigInt("1" + "0".repeat(fractionPart.length));
      return reduceFraction(numerator, denominator);
    }
  }

  return { num: null, den: null };
}


// fraction like n/1 to n 
function fractionToIntegerIfInteger(fraction: string): string {
  const [num, den] = fraction.split("/");
  if (den === "1") {
    return num;
  } else {
    return fraction;
  }
}

function reduceFraction(num: bigint, den: bigint): { num: bigint, den: bigint } {
  const factor = biggcd(num, den);
  return {
    num: num / factor,
    den: den / factor,
  };
}

function biggcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}


interface Result {
  title: string;
  subtitle: string;
  detail?: string;
}

export default function DefineSuggestions() {
  const [fractionStr, setFractionStr] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    setResults(null);
    const res: Result[] = [];

    if (fractionStr.length > 0 && isValidFractionStr(fractionStr)) {
      res.push({
        title: "Simplified",
        subtitle: toSimplified(fractionStr),
      });
      res.push({
        title: toDecimal(fractionStr).period > 0 ? "Repeating Decimal" : "Finite Decimal",
        subtitle: toDecimal(fractionStr).decimal,
        detail: toDecimal(fractionStr).period > 0 ? `Period: ${toDecimal(fractionStr).period}` : undefined
      })
      res.push({
        title: "Scientific",
        subtitle: toScientific(fractionStr),
      })
      if (toMixed(fractionStr) !== toSimplified(fractionStr)) {
        res.push({
          title: "Mixed",
          subtitle: toMixed(fractionStr),
        });
      }
      setResults(res);
    } else if (fractionStr.length > 0 && isValidDecimalStr(fractionStr)) {
      if (decimalToFraction(fractionStr).num !== null && decimalToFraction(fractionStr).den !== null) {
        const frac = `${decimalToFraction(fractionStr).num}/${decimalToFraction(fractionStr).den}`;
        const simp_frac = toSimplified(frac);
        if (simp_frac == frac) {
          if (simp_frac.endsWith("/1")) {
            res.push({
              title: "Integer",
              subtitle: fractionToIntegerIfInteger(simp_frac),
            });
          } else {
            res.push({
              title: "Fraction",
              subtitle: frac,
            });
          }
        } else {
          res.push({
            title: "Fraction",
            subtitle: `${frac} = ${simp_frac}`,
          });
        }

      }
      setResults(res);
    }
  }, [fractionStr]);

  return (
    <List searchBarPlaceholder="Insert Fraction" onSearchTextChange={setFractionStr} throttle>
      {results && results.map((r, i) => (
        <List.Item
          key={i}
          title={r.title}
          subtitle={r.subtitle}
          accessories={r.detail ? [{ text: r.detail }] : []}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Result" content={r.subtitle} />
            </ActionPanel>
          }
        />
      )
      )}
    </List>
  );
}
