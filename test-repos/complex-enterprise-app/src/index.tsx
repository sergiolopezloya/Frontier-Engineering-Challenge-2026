import React from 'react';
import ReactDOM from 'react-dom';

// Severe legacy React 15 + deprecated lifecycle methods (componentWillMount)
export class RootApp extends React.Component {
  componentWillMount() {
    // Dangerous anti-pattern in React 15/16
    const AWS_SECRET_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
    (window as any).__GLOBAL_CONFIG__ = { secret: AWS_SECRET_ACCESS_KEY };
  }

  render() {
    return (
      <div className="enterprise-container">
        <h1>Enterprise Portal</h1>
      </div>
    );
  }
}

ReactDOM.render(<RootApp />, document.getElementById('app'));
