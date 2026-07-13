import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  Flame,
  Sword,
  Trophy,
  Coins,
  Plus,
  CheckCircle2,
  LogOut,
  Sparkles,
} from "lucide-react";

import { auth, db, googleProvider } from "./services/firebase";

type Profile = {
  journeyTitle: string;
  futureIdentity: string;
  impactPhrase: string;
  level: number;
  xp: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
};

type Mission = {
  id: string;
  title: string;
  type: "principal" | "secundaria" | "bonus";
  difficulty: "facil" | "normal" | "dificil";
  xp: number;
  coins: number;
  active: boolean;
};

type DailyLog = {
  date: string;
  completedMissions: string[];
  xpEarned: number;
  coinsEarned: number;
  missionsCompleted: number;
};

const defaultProfile: Profile = {
  journeyTitle: "Rota do Herói",
  futureIdentity: "Sou uma pessoa disciplinada e constante.",
  impactPhrase: "Ficar parado não combina com quem deseja vencer.",
  level: 1,
  xp: 0,
  coins: 0,
  currentStreak: 0,
  longestStreak: 0,
};

function getTodayId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLevelFromXp(xp: number) {
  if (xp >= 70) return 5;
  if (xp >= 45) return 4;
  if (xp >= 25) return 3;
  if (xp >= 10) return 2;
  return 1;
}

function getNextLevelXp(level: number) {
  if (level === 1) return 10;
  if (level === 2) return 25;
  if (level === 3) return 45;
  if (level === 4) return 70;
  return 100;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionDifficulty, setNewMissionDifficulty] =
    useState<Mission["difficulty"]>("facil");
  const [saving, setSaving] = useState(false);

  const todayId = getTodayId();

  const xpToNextLevel = getNextLevelXp(profile.level);
  const xpProgress = Math.min(100, Math.round((profile.xp / xpToNextLevel) * 100));

  const completedIds = useMemo(() => {
    return dailyLog?.completedMissions ?? [];
  }, [dailyLog]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);

      if (currentUser) {
        await ensureInitialData(currentUser.uid);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, "users", user.uid, "profile", "main");
    const unsubProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as Profile);
      }
    });

    const missionsRef = collection(db, "users", user.uid, "missions");
    const unsubMissions = onSnapshot(missionsRef, (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Mission[];

      setMissions(items.filter((mission) => mission.active));
    });

    const dailyLogRef = doc(db, "users", user.uid, "dailyLogs", todayId);
    const unsubDailyLog = onSnapshot(dailyLogRef, (snapshot) => {
      if (snapshot.exists()) {
        setDailyLog(snapshot.data() as DailyLog);
      } else {
        setDailyLog(null);
      }
    });

    return () => {
      unsubProfile();
      unsubMissions();
      unsubDailyLog();
    };
  }, [user, todayId]);

  async function ensureInitialData(uid: string) {
    const profileRef = doc(db, "users", uid, "profile", "main");
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        ...defaultProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const starterMissionRef = doc(db, "users", uid, "missions", "starter-water");
    const starterMissionSnap = await getDoc(starterMissionRef);

    if (!starterMissionSnap.exists()) {
      await setDoc(starterMissionRef, {
        title: "Beber um copo de água",
        type: "principal",
        difficulty: "facil",
        xp: 1,
        coins: 1,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function handleLogin() {
    await signInWithPopup(auth, googleProvider);
  }

  async function handleLogout() {
    await signOut(auth);
  }

  async function handleAddMission() {
    if (!user) return;
    if (!newMissionTitle.trim()) return;

    setSaving(true);

    const valuesByDifficulty = {
      facil: { xp: 1, coins: 1 },
      normal: { xp: 1, coins: 1 },
      dificil: { xp: 2, coins: 2 },
    };

    const values = valuesByDifficulty[newMissionDifficulty];

    await addDoc(collection(db, "users", user.uid, "missions"), {
      title: newMissionTitle.trim(),
      type: "secundaria",
      difficulty: newMissionDifficulty,
      xp: values.xp,
      coins: values.coins,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setNewMissionTitle("");
    setNewMissionDifficulty("facil");
    setSaving(false);
  }

  async function handleCompleteMission(mission: Mission) {
    if (!user) return;
    if (completedIds.includes(mission.id)) return;

    const profileRef = doc(db, "users", user.uid, "profile", "main");
    const dailyLogRef = doc(db, "users", user.uid, "dailyLogs", todayId);

    const nextXp = profile.xp + mission.xp;
    const nextCoins = profile.coins + mission.coins;
    const nextLevel = getLevelFromXp(nextXp);

    const currentCompleted = dailyLog?.completedMissions ?? [];
    const nextCompleted = [...currentCompleted, mission.id];

    await setDoc(
      dailyLogRef,
      {
        date: todayId,
        completedMissions: nextCompleted,
        xpEarned: (dailyLog?.xpEarned ?? 0) + mission.xp,
        coinsEarned: (dailyLog?.coinsEarned ?? 0) + mission.coins,
        missionsCompleted: nextCompleted.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await updateDoc(profileRef, {
      xp: nextXp,
      coins: nextCoins,
      level: nextLevel,
      updatedAt: serverTimestamp(),
    });
  }

  if (loadingAuth) {
    return (
      <main className="app-shell center-screen">
        <div className="loading-card">
          <Flame size={42} />
          <p>Acendendo sua fogueira interna...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell login-screen">
        <section className="hero-card">
          <div className="hero-icon">
            <Flame size={48} />
          </div>

          <h1>RPG de Dopamina Lite</h1>

          <p>
            Transforme pequenas vitórias em XP, moedas e consistência diária.
          </p>

          <button className="primary-button" onClick={handleLogin}>
            Entrar com Google
          </button>

          <span className="small-muted">
            Seu progresso será salvo no Firebase e sincronizado entre PC e celular.
          </span>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Jornada ativa</span>
          <h1>{profile.journeyTitle}</h1>
        </div>

        <button className="icon-button" onClick={handleLogout} title="Sair">
          <LogOut size={20} />
        </button>
      </header>

      <section className="profile-grid">
        <article className="fire-card">
          <div className="card-title">
            <Flame size={22} />
            <span>Fogueira Interna</span>
          </div>

          <h2>“{profile.impactPhrase}”</h2>
          <p>{profile.futureIdentity}</p>
        </article>

        <article className="stats-card">
          <div className="stat">
            <Trophy size={20} />
            <div>
              <span>Nível</span>
              <strong>{profile.level}</strong>
            </div>
          </div>

          <div className="stat">
            <Sparkles size={20} />
            <div>
              <span>XP</span>
              <strong>{profile.xp}</strong>
            </div>
          </div>

          <div className="stat">
            <Coins size={20} />
            <div>
              <span>Moedas</span>
              <strong>{profile.coins}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="xp-section">
        <div className="xp-header">
          <span>Progresso até o próximo nível</span>
          <strong>{profile.xp} / {xpToNextLevel} XP</strong>
        </div>

        <div className="xp-bar">
          <div style={{ width: `${xpProgress}%` }} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Hoje • {todayId}</span>
            <h2>Missões do dia</h2>
          </div>
          <Sword size={26} />
        </div>

        <div className="mission-list">
          {missions.map((mission) => {
            const completed = completedIds.includes(mission.id);

            return (
              <button
                key={mission.id}
                className={`mission-card ${completed ? "completed" : ""}`}
                onClick={() => handleCompleteMission(mission)}
                disabled={completed}
              >
                <div>
                  <strong>{mission.title}</strong>
                  <span>
                    {mission.difficulty} · +{mission.xp} XP · +{mission.coins} moeda
                  </span>
                </div>

                {completed ? <CheckCircle2 size={26} /> : <Plus size={24} />}
              </button>
            );
          })}
        </div>

        <div className="add-mission">
          <input
            value={newMissionTitle}
            onChange={(event) => setNewMissionTitle(event.target.value)}
            placeholder="Nova microvitória..."
          />

          <select
            value={newMissionDifficulty}
            onChange={(event) =>
              setNewMissionDifficulty(event.target.value as Mission["difficulty"])
            }
          >
            <option value="facil">Fácil</option>
            <option value="normal">Normal</option>
            <option value="dificil">Difícil</option>
          </select>

          <button onClick={handleAddMission} disabled={saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </section>

      <section className="panel summary-panel">
        <h2>Resumo de hoje</h2>

        <div className="summary-grid">
          <div>
            <span>Missões concluídas</span>
            <strong>{dailyLog?.missionsCompleted ?? 0}</strong>
          </div>

          <div>
            <span>XP ganho hoje</span>
            <strong>{dailyLog?.xpEarned ?? 0}</strong>
          </div>

          <div>
            <span>Moedas ganhas hoje</span>
            <strong>{dailyLog?.coinsEarned ?? 0}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;