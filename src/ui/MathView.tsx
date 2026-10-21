import type { ReactNode } from 'react'

/* ================================================================== */
/*  Mathematical Typography Components ("Como no papel")               */
/* ================================================================== */

interface MathProps {
  children: ReactNode
  className?: string
}

/** Inline math expression with paper typography and centered vertical alignment */
export function MathText({ children, className = '' }: MathProps) {
  return <span className={`math-inline ${className}`}>{children}</span>
}

/** Display equation block: centered, elegant, styled like a textbook equation */
export function MathBlock({ children, className = '' }: MathProps) {
  return (
    <div className={`math-display-block ${className}`} role="math">
      <div className="math-display-inner">{children}</div>
    </div>
  )
}

/** Italicized mathematical variable (e.g. x, y, z, f) */
export function MVar({ children }: { children: ReactNode }) {
  return <var className="math-var">{children}</var>
}

/** Upright function or operator name (e.g. sin, cos, det) */
export function MFn({ children }: { children: ReactNode }) {
  return <span className="math-fn">{children}</span>
}

/** Proper horizontal fraction with numerator, denominator and fraction bar */
export function MFrac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="math-frac">
      <span className="math-num">{num}</span>
      <span className="math-den">{den}</span>
    </span>
  )
}

/** Subscript (e.g. f_xx -> f with xx subscript) */
export function MSub({ base, sub }: { base: ReactNode; sub: ReactNode }) {
  return (
    <span className="math-sub-wrapper">
      {base}
      <sub className="math-sub">{sub}</sub>
    </span>
  )
}

/** Superscript (e.g. cos²(x) -> cos with 2 superscript) */
export function MSup({ base, sup }: { base: ReactNode; sup: ReactNode }) {
  return (
    <span className="math-sup-wrapper">
      {base}
      <sup className="math-sup">{sup}</sup>
    </span>
  )
}

/** Square root with a clean radical symbol and horizontal vinculum bar */
export function MSqrt({ children }: { children: ReactNode }) {
  return (
    <span className="math-sqrt">
      <span className="math-sqrt-radical" aria-hidden="true">
        √
      </span>
      <span className="math-sqrt-body">{children}</span>
    </span>
  )
}

/** Partial derivative notation: ∂f / ∂x or ∂²f / ∂x² */
export function MPartial({
  num = 'f',
  den = 'x',
  order,
}: {
  num?: ReactNode
  den?: ReactNode
  order?: number
}) {
  const numNode = typeof num === 'string' ? <MVar>{num}</MVar> : num
  const denNode = typeof den === 'string' ? <MVar>{den}</MVar> : den

  if (order === 2) {
    return (
      <MFrac
        num={
          <>
            ∂<sup className="math-sup">2</sup>
            {numNode}
          </>
        }
        den={
          <>
            ∂{denNode}
            <sup className="math-sup">2</sup>
          </>
        }
      />
    )
  }
  return <MFrac num={<>∂{numNode}</>} den={<>∂{denNode}</>} />
}

/** System of equations with a clean left curly brace */
export function MathSystem({ children }: { children: ReactNode }) {
  return (
    <div className="math-system-container">
      <span className="math-system-brace" aria-hidden="true">
        &#123;
      </span>
      <div className="math-system-rows">{children}</div>
    </div>
  )
}

/** Aligned equations group (stacked and cleanly centered) */
export function MathAlign({ rows }: { rows: ReactNode[] }) {
  return (
    <div className="math-align-container">
      {rows.map((row, idx) => (
        <div key={idx} className="math-align-row">
          {row}
        </div>
      ))}
    </div>
  )
}
