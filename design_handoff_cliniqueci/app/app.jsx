// ─── Top-level CliniqueCI App ───

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);

  function login(user) {
    setCurrentUser(user);
    setAiContext({});
  }
  function logout() {
    setCurrentUser(null);
    setAiOpen(false);
    setAiContext({});
  }

  if (!currentUser) {
    return (
      <ToastProvider>
        <LoginScreen onLogin={login}/>
      </ToastProvider>
    );
  }

  const role = currentUser.role;

  return (
    <ToastProvider>
      {role === 'medecin' && (
        <MedecinApp
          currentUser={currentUser}
          onLogout={logout}
          aiContext={aiContext}
          setAIContext={(ctx) => { setAiContext(ctx); setAiOpen(true); }}
          onToggleAI={() => setAiOpen(o => !o)}
          aiOpen={aiOpen}
          openNotifs={notifOpen}
          onOpenNotifs={() => setNotifOpen(o => !o)}
        />
      )}
      {role === 'secretaire' && (
        <SecretaireApp
          currentUser={currentUser}
          onLogout={logout}
          aiContext={aiContext}
          setAIContext={(ctx) => { setAiContext(ctx); setAiOpen(true); }}
          onToggleAI={() => setAiOpen(o => !o)}
          aiOpen={aiOpen}
          openNotifs={notifOpen}
          onOpenNotifs={() => setNotifOpen(o => !o)}
        />
      )}
      {role === 'patient' && (
        <PatientApp
          currentUser={currentUser}
          onLogout={logout}
          aiContext={aiContext}
          setAIContext={setAiContext}
          onToggleAI={() => setAiOpen(o => !o)}
          aiOpen={aiOpen}
        />
      )}

      {/* AI Panel — shared overlay */}
      <AIAgentPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        role={role}
        context={aiContext}
        currentUser={currentUser}
      />

      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)}/>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
