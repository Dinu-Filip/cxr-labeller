import { useState } from 'react'
import styles from './TokenGate.module.css'

type Props = {
  message: string | null
  onSubmit: (token: string) => void
}

export function TokenGate({ message, onSubmit }: Props) {
  const [value, setValue] = useState('')

  return (
    <div className={styles.wrap}>
      <form
        className={styles.panel}
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = value.trim()
          if (trimmed) onSubmit(trimmed)
        }}
      >
        <h1 className={styles.title}>cxr-labeller</h1>
        <p className={styles.hint}>
          Paste your reviewer token to start rating.
        </p>
        {message ? <p className={styles.error}>{message}</p> : null}
        <input
          className={styles.input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-label="Reviewer token"
          placeholder="reviewer token"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={value.trim().length === 0}
        >
          Continue
        </button>
      </form>
    </div>
  )
}
