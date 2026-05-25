import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    toast.error(error.message || 'Unexpected rendering error.');
    console.error('Render error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen">
          <div className="error-card">
            <div className="error-icon">
              <AlertTriangle size={30} />
            </div>
            <h1>Something broke in the interface.</h1>
            <p>
              The application hit an unexpected render error. You can reset the UI and try again.
            </p>
            <button className="button button-primary" onClick={this.handleReset} type="button">
              <RotateCcw size={16} />
              Reset screen
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}