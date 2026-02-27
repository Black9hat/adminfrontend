import React from "react";

const FULL_SCREEN_WRAPPER = (Content: React.ComponentType<any>) => {
  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #0f1117 0%, #131820 100%)",
      fontFamily: "'Syne','Segoe UI',sans-serif",
      margin: 0,
      padding: 0,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.4); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.6); }
      `}</style>
      
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "2rem",
        width: "100%",
      }}>
        <Content />
      </div>
    </div>
  );
};

function SettingsUnwrapped() {
  return <h1 className="text-2xl font-bold">⚙️ Settings</h1>;
}

export default FULL_SCREEN_WRAPPER(SettingsUnwrapped);