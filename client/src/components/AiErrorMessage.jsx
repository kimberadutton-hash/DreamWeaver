import { Link } from 'react-router-dom';
import { AiError } from '../lib/ai';

// Renders a helpful message for AiError instances, plain text for others.
export default function AiErrorMessage({ error }) {
  if (!error) return null;

  if (error instanceof AiError && (error.type === 'invalid_key' || error.type === 'no_credits')) {
    return (
      <p className="text-red-600 text-sm font-body">
        {error.message}{' '}
        <Link to="/settings" className="underline hover:text-red-800">Settings →</Link>
      </p>
    );
  }

  if (error instanceof AiError && error.type === 'no_key') {
    return (
      <p className="text-amber-700 text-sm font-body">
        No API key configured.{' '}
        <Link to="/settings" className="underline hover:text-amber-900">Add yours in Settings →</Link>
      </p>
    );
  }

  return <p className="text-red-600 text-sm font-body">{error.message || String(error)}</p>;
}
