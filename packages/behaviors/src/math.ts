/**
 * Safe arithmetic for number fields: "12*2", "(10+4)/2", "-3^2", "50%".
 * No eval. Returns NaN for anything that isn't a valid expression.
 *
 * Grammar:
 *   expr   = term (("+" | "-") term)*
 *   term   = unary (("*" | "/" | "%") unary)*
 *   unary  = ("-" | "+") unary | power
 *   power  = atom ("^" unary)?
 *   atom   = number | "(" expr ")"
 */
export function evaluate(input: string): number {
  const src = input.replace(/\s+/g, "").replace(/,/g, "");
  let i = 0;

  const peek = () => src[i];
  const eat = (ch: string) => {
    if (src[i] === ch) {
      i++;
      return true;
    }
    return false;
  };

  function expr(): number {
    let value = term();
    for (;;) {
      if (eat("+")) value += term();
      else if (eat("-")) value -= term();
      else return value;
    }
  }

  function term(): number {
    let value = unary();
    for (;;) {
      if (eat("*")) value *= unary();
      else if (eat("/")) value /= unary();
      else if (peek() === "%" && /[\d.(]/.test(src[i + 1] ?? "")) {
        i++;
        value %= unary();
      } else return value;
    }
  }

  function unary(): number {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return power();
  }

  function power(): number {
    const base = atom();
    if (eat("^")) return base ** unary();
    return base;
  }

  function atom(): number {
    if (eat("(")) {
      const value = expr();
      if (!eat(")")) throw new SyntaxError("Expected )");
      return value;
    }
    const match = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (!match) throw new SyntaxError(`Unexpected "${peek() ?? "end"}"`);
    i += match[0].length;
    let value = Number(match[0]);
    // Trailing percent means "per hundred": 50% → 0.5
    if (peek() === "%" && !/[\d.(]/.test(src[i + 1] ?? "")) {
      i++;
      value /= 100;
    }
    return value;
  }

  try {
    if (!src) return Number.NaN;
    const value = expr();
    return i === src.length && Number.isFinite(value) ? value : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
