interface Props {
  usingOwnText: boolean;
}

/**
 * The product's only piece of chrome. Deliberately a single line: an interface
 * that spends its opening on a hero has less room for the thing being taught.
 */
export default function Masthead({ usingOwnText }: Props) {
  return (
    <header className="masthead">
      <div className="masthead__mark">
        <span className="masthead__name">Typecase</span>
        <span className="masthead__rule" aria-hidden="true" />
        <span className="masthead__line">
          A typesetting studio you and your agent operate together.
        </span>
      </div>
      <div className="masthead__right">
        <span className="masthead__state">
          {usingOwnText ? "setting your text" : "setting the sample"}
        </span>
        {/* On a wide screen the studio is a rail that is always in view. Once the
            layout stacks, it sits below the whole article, so it needs a way in. */}
        <a className="masthead__jump" href="#studio">
          studio ↓
        </a>
      </div>
    </header>
  );
}
