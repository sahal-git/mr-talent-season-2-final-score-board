import { useState, useEffect } from 'react';
import { Pencil, Plus, Trophy, Medal, X, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';

interface Candidate {
  id: string;
  name: string;
  letter: string;
  color_theme: string;
}

interface Round {
  id: string;
  name: string;
}

interface RoundCandidateScore {
  id: string;
  round_id: string;
  candidate_id: string;
  score: number;
}

interface CandidateWithScore extends Candidate {
  score: number;
}

const colorThemes = [
  'from-yellow-400 to-orange-500',
  'from-orange-400 to-pink-500',
  'from-cyan-400 to-teal-500',
  'from-purple-400 to-indigo-500',
  'from-green-400 to-blue-500',
  'from-red-400 to-pink-500',
  'from-blue-400 to-purple-500',
  'from-indigo-400 to-gray-500',
];

function App() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRound, setActiveRound] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateScores, setCandidateScores] = useState<RoundCandidateScore[]>([]);
  const [allRoundScores, setAllRoundScores] = useState<RoundCandidateScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRound, setEditingRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [editingCandidateName, setEditingCandidateName] = useState<string | null>(null);
  const [editingCandidateScore, setEditingCandidateScore] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editScore, setEditScore] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateLetter, setNewCandidateLetter] = useState('');
  const [showGrandTotal, setShowGrandTotal] = useState(false);
  const [expandedOtherCandidates, setExpandedOtherCandidates] = useState(false);
  const [celebratingRanks, setCelebratingRanks] = useState<Set<number>>(new Set([1, 2, 3]));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeRound && !showGrandTotal) {
      loadRoundScores(activeRound);
    }
  }, [activeRound, showGrandTotal]);

  useEffect(() => {
    if (showGrandTotal) {
      loadAllRoundScores();
    }
  }, [showGrandTotal]);

  const loadData = async () => {
    try {
      await Promise.all([loadRounds(), loadAllCandidates()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRounds = async () => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setRounds(data);
        setActiveRound(data[0].id);
      } else {
        await createDefaultRound();
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
    }
  };

  const loadAllCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length === 0) {
        await createDefaultCandidates();
      } else {
        setCandidates(data || []);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const createDefaultRound = async () => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .insert([{ name: 'Round 1' }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setRounds(data);
        setActiveRound(data[0].id);
      }
    } catch (error) {
      console.error('Error creating default round:', error);
    }
  };

  const createDefaultCandidates = async () => {
    try {
      const defaultCandidates = [
        { name: 'Candidate A', letter: 'A' },
        { name: 'Candidate B', letter: 'B' },
        { name: 'Candidate C', letter: 'C' },
        { name: 'Candidate D', letter: 'D' },
        { name: 'Candidate E', letter: 'E' },
        { name: 'Candidate F', letter: 'F' },
      ];

      const candidatesToInsert = defaultCandidates.map((candidate, index) => ({
        ...candidate,
        color_theme: colorThemes[index % colorThemes.length],
      }));

      const { data, error } = await supabase
        .from('candidates')
        .insert(candidatesToInsert)
        .select();

      if (error) throw error;

      if (data) {
        setCandidates(data);
      }
    } catch (error) {
      console.error('Error creating default candidates:', error);
    }
  };

  const loadRoundScores = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('round_candidate_scores')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const scores = data || [];

      for (const candidate of candidates) {
        const existingScore = scores.find(s => s.candidate_id === candidate.id);
        if (!existingScore) {
          await supabase
            .from('round_candidate_scores')
            .insert([{
              round_id: roundId,
              candidate_id: candidate.id,
              score: 0
            }]);
        }
      }

      const updatedData = await supabase
        .from('round_candidate_scores')
        .select('*')
        .eq('round_id', roundId);

      setCandidateScores(updatedData.data || []);
    } catch (error) {
      console.error('Error loading round scores:', error);
    }
  };

  const loadAllRoundScores = async () => {
    try {
      const { data, error } = await supabase
        .from('round_candidate_scores')
        .select('*');

      if (error) throw error;

      setAllRoundScores(data || []);
    } catch (error) {
      console.error('Error loading all round scores:', error);
    }
  };

  const addScore = async (candidateId: string, points: number) => {
    if (!activeRound) return;

    try {
      const scoreRecord = candidateScores.find(s => s.candidate_id === candidateId);
      if (!scoreRecord) return;

      const newScore = scoreRecord.score + points;

      const { error } = await supabase
        .from('round_candidate_scores')
        .update({ score: newScore })
        .eq('id', scoreRecord.id);

      if (error) throw error;

      setCandidateScores(candidateScores.map(s =>
        s.id === scoreRecord.id
          ? { ...s, score: newScore }
          : s
      ));
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  const addNewRound = async () => {
    const roundName = newRoundName.trim() || `Round ${rounds.length + 1}`;

    try {
      const { data, error } = await supabase
        .from('rounds')
        .insert([{ name: roundName }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setRounds([...rounds, data[0]]);
        setNewRoundName('');
        setEditingRound(false);
        setActiveRound(data[0].id);

        const scoresToInsert = candidates.map(candidate => ({
          round_id: data[0].id,
          candidate_id: candidate.id,
          score: 0
        }));

        if (scoresToInsert.length > 0) {
          await supabase
            .from('round_candidate_scores')
            .insert(scoresToInsert);
        }
      }
    } catch (error) {
      console.error('Error adding round:', error);
    }
  };

  const startEditName = (candidateId: string, currentName: string) => {
    setEditingCandidateName(candidateId);
    setEditName(currentName);
  };

  const saveCandidateName = async (candidateId: string) => {
    if (!editName.trim()) {
      setEditingCandidateName(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ name: editName.trim() })
        .eq('id', candidateId);

      if (error) throw error;

      setCandidates(candidates.map(c =>
        c.id === candidateId
          ? { ...c, name: editName.trim() }
          : c
      ));
      setEditingCandidateName(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating candidate name:', error);
    }
  };

  const startEditScore = (candidateId: string) => {
    const scoreRecord = candidateScores.find(s => s.candidate_id === candidateId);
    if (scoreRecord) {
      setEditingCandidateScore(candidateId);
      setEditScore(scoreRecord.score.toString());
    }
  };

  const saveCandidateScore = async (candidateId: string) => {
    const newScore = parseInt(editScore, 10);
    if (isNaN(newScore)) {
      setEditingCandidateScore(null);
      return;
    }

    try {
      const scoreRecord = candidateScores.find(s => s.candidate_id === candidateId);
      if (!scoreRecord) return;

      const { error } = await supabase
        .from('round_candidate_scores')
        .update({ score: newScore })
        .eq('id', scoreRecord.id);

      if (error) throw error;

      setCandidateScores(candidateScores.map(s =>
        s.id === scoreRecord.id
          ? { ...s, score: newScore }
          : s
      ));
      setEditingCandidateScore(null);
      setEditScore('');
    } catch (error) {
      console.error('Error updating candidate score:', error);
    }
  };

  const addCandidate = async () => {
    if (!newCandidateName.trim() || !newCandidateLetter.trim()) {
      return;
    }

    try {
      const colorIndex = candidates.length % colorThemes.length;
      const { data, error } = await supabase
        .from('candidates')
        .insert([{
          name: newCandidateName.trim(),
          letter: newCandidateLetter.trim().toUpperCase(),
          color_theme: colorThemes[colorIndex]
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newCandidate = data[0];
        setCandidates([...candidates, newCandidate]);

        if (activeRound) {
          await supabase
            .from('round_candidate_scores')
            .insert([{
              round_id: activeRound,
              candidate_id: newCandidate.id,
              score: 0
            }]);

          const updatedScores = await supabase
            .from('round_candidate_scores')
            .select('*')
            .eq('round_id', activeRound);

          setCandidateScores(updatedScores.data || []);
        }

        for (const round of rounds) {
          const existingScore = await supabase
            .from('round_candidate_scores')
            .select('*')
            .eq('round_id', round.id)
            .eq('candidate_id', newCandidate.id);

          if (existingScore.data && existingScore.data.length === 0) {
            await supabase
              .from('round_candidate_scores')
              .insert([{
                round_id: round.id,
                candidate_id: newCandidate.id,
                score: 0
              }]);
          }
        }

        setNewCandidateName('');
        setNewCandidateLetter('');
        setAddingCandidate(false);
      }
    } catch (error) {
      console.error('Error adding candidate:', error);
    }
  };

  const deleteCandidate = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${candidate.name}? This will delete all their scores across all rounds. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) throw error;

      setCandidates(candidates.filter(c => c.id !== candidateId));
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const deleteRound = async (roundId: string) => {
    if (rounds.length === 1) {
      alert('Cannot delete the last round');
      return;
    }

    const round = rounds.find(r => r.id === roundId);
    if (!round) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${round.name}? This will permanently delete all scores for this round. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);

      if (error) throw error;

      const newRounds = rounds.filter(r => r.id !== roundId);
      setRounds(newRounds);

      if (activeRound === roundId) {
        setActiveRound(newRounds[0].id);
      }
    } catch (error) {
      console.error('Error deleting round:', error);
    }
  };

  const getCandidateScore = (candidateId: string): number => {
    return candidateScores.find(s => s.candidate_id === candidateId)?.score || 0;
  };

  const getGrandTotalScore = (candidateId: string): number => {
    return allRoundScores
      .filter(s => s.candidate_id === candidateId)
      .reduce((sum, score) => sum + score.score, 0);
  };

  const totalScore = candidateScores.reduce((sum, score) => sum + score.score, 0);

  const getRanking = (candidateId: string) => {
    const sorted = [...candidates].sort((a, b) => getCandidateScore(b.id) - getCandidateScore(a.id));
    return sorted.findIndex(c => c.id === candidateId) + 1;
  };

  const getGrandTotalRanking = (candidateId: string) => {
    const sorted = [...candidates].sort((a, b) => getGrandTotalScore(b.id) - getGrandTotalScore(a.id));
    return sorted.findIndex(c => c.id === candidateId) + 1;
  };

  const getRankingBadge = (rank: number) => {
    if (rank === 1) {
      return {
        icon: Trophy,
        bg: 'bg-yellow-300',
        text: 'text-yellow-900',
        label: '1st'
      };
    } else if (rank === 2) {
      return {
        icon: Medal,
        bg: 'bg-gray-200',
        text: 'text-gray-800',
        label: '2nd'
      };
    } else if (rank === 3) {
      return {
        icon: Medal,
        bg: 'bg-orange-200',
        text: 'text-orange-800',
        label: '3rd'
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center overflow-x-hidden">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-opacity-90 p-0">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
          <div className="flex flex-col items-center mb-6">
            <img src="/image.png" alt="Logo" className="h-48 w-48 object-contain mb-4" />
            <h1 className="text-sm font-bold text-center">Candidate Scoreboard</h1>
          </div>
          
          <div className="mb-4">
            <button
              onClick={() => {
                setShowGrandTotal(true);
                setActiveRound(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all mb-2 text-sm ${
                showGrandTotal
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Grand Total
            </button>
          </div>
          
          <div className="mb-4 flex-1">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rounds</h2>
              <button
                onClick={() => setEditingRound(true)}
                className="p-1 bg-gray-800 hover:bg-gray-700 rounded-full"
                title="Add Round"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {rounds.map((round) => (
                <div key={round.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveRound(round.id);
                      setShowGrandTotal(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      activeRound === round.id && !showGrandTotal
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {round.name}
                  </button>
                  {rounds.length > 1 && (
                    <button
                      onClick={() => deleteRound(round.id)}
                      className="absolute top-1/2 -translate-y-1/2 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete round"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            {editingRound && (
              <div className="space-y-2 mb-2">
                <input
                  type="text"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  placeholder={`Round ${rounds.length + 1}`}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addNewRound()}
                />
                <div className="flex gap-1">
                  <button
                    onClick={addNewRound}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-800 transition-all text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setEditingRound(false);
                      setNewRoundName('');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {candidates.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">No candidates yet.</p>
                <button
                  onClick={() => setAddingCandidate(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-800 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add First Candidate
                </button>
              </div>
            ) : showGrandTotal ? (
              <>
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 rounded-3xl shadow-2xl p-8 text-center border border-purple-700">
                    <div className="inline-flex items-center gap-3 mb-2">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                      <h2 className="text-3xl font-bold text-white">Final Standings</h2>
                      <Trophy className="w-8 h-8 text-yellow-400" />
                    </div>
                    <p className="text-purple-200 text-lg">Cumulative scores across all rounds</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  {[...candidates]
                    .sort((a, b) => getGrandTotalScore(b.id) - getGrandTotalScore(a.id))
                    .slice(0, 3)
                    .map((candidate, index) => {
                      const rank = index + 1;
                      const badge = getRankingBadge(rank);
                      const BadgeIcon = badge?.icon;
                      const totalScore = getGrandTotalScore(candidate.id);
                      const maxScore = Math.max(...candidates.map(c => getGrandTotalScore(c.id)));
                      const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
                      const isCelebrating = celebratingRanks.has(rank);
                      // Find the original index of this candidate in the candidates array
                      const candidateIndex = candidates.findIndex(c => c.id === candidate.id);
                      const colorTheme = candidateIndex !== -1 ? colorThemes[candidateIndex % colorThemes.length] : colorThemes[index % colorThemes.length];

                      return (
                        <div
                          key={candidate.id}
                          className={`relative overflow-hidden rounded-3xl shadow-2xl transform transition-all duration-300 hover:scale-105 ${
                            rank === 1
                              ? 'lg:col-start-2 lg:row-start-1 lg:scale-110'
                              : rank === 2
                              ? 'lg:col-start-1 lg:row-start-1'
                              : 'lg:col-start-3 lg:row-start-1'
                          } ${isCelebrating ? 'animate' : ''}`}
                          style={{
                            background: rank === 1
                              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                              : rank === 2
                              ? 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)'
                              : 'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)'
                          }}
                        >
                          <div className="absolute top-0 left-0 w-full h-2 bg-white opacity-30"></div>
                          {isCelebrating && (
                            <>
                              <div className="absolute top-2 left-4 animate-pulse text-2xl">✨</div>
                              <div className="absolute top-4 right-6 animate-pulse text-2xl" style={{ animationDelay: '0.5s' }}>✨</div>
                              <div className="absolute bottom-8 left-8 animate-pulse text-2xl" style={{ animationDelay: '1s' }}>✨</div>
                            </>
                          )}
                          <div className="p-8">
                            <div className="flex flex-col items-center text-center">
                              {badge && BadgeIcon && (
                                <div className={`${badge.bg} ${badge.text} rounded-full w-20 h-20 flex items-center justify-center shadow-xl mb-4 border-4 border-white`}>
                                  <div className="flex flex-col items-center">
                                    <BadgeIcon className="w-8 h-8" />
                                    <span className="text-sm font-bold">{badge.label}</span>
                                  </div>
                                </div>
                              )}

                              <h3 className="text-4xl font-bold text-gray-900 mb-4">{candidate.name}</h3>

                              <div className={`w-16 h-16 bg-gradient-to-br ${colorTheme} rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-white`}>
                                <span className="text-white text-2xl font-bold">{candidate.letter}</span>
                              </div>

                              <div className="w-full bg-white bg-opacity-50 rounded-full h-3 mb-4 overflow-hidden">
                                <div
                                  className="bg-gray-900 h-full rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${scorePercentage}%` }}
                                ></div>
                              </div>

                              <div className="bg-white bg-opacity-90 rounded-2xl p-6 w-full shadow-lg">
                                <div className="text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wide">Total Score</div>
                                <div className="text-6xl font-bold text-gray-900">{totalScore}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {candidates.length > 3 && (
                  <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-200 mb-8">
                    <button
                      onClick={() => setExpandedOtherCandidates(!expandedOtherCandidates)}
                      className="w-full bg-gradient-to-r from-purple-50 to-indigo-100 py-4 px-6 border-b border-gray-200 flex items-center justify-between hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-200 transition-all"
                    >
                      <h3 className="text-xl font-bold text-gray-900">Other Candidates</h3>
                      <div className="text-gray-500 transition-transform" style={{ transform: expandedOtherCandidates ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                      </div>
                    </button>
                    {expandedOtherCandidates && (
                      <div className="divide-y divide-gray-200">
                        {[...candidates]
                          .sort((a, b) => getGrandTotalScore(b.id) - getGrandTotalScore(a.id))
                          .slice(3)
                          .map((candidate, index) => {
                            const rank = index + 4;
                            const totalScore = getGrandTotalScore(candidate.id);
                            const isCelebrating = celebratingRanks.has(rank);
                            // Find the original index of this candidate in the candidates array
                            const candidateIndex = candidates.findIndex(c => c.id === candidate.id);
                            const colorTheme = candidateIndex !== -1 ? colorThemes[candidateIndex % colorThemes.length] : colorThemes[index % colorThemes.length];

                            return (
                              <div
                                key={candidate.id}
                                className={`flex items-center justify-between p-6 hover:bg-gray-50 transition-all group ${isCelebrating ? 'animate bg-yellow-50' : ''}`}
                              >
                                {isCelebrating && (
                                  <div className="absolute left-2 text-xl animate-pulse">✨</div>
                                )}
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                                    <span className="text-2xl font-bold text-gray-600">#{rank}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xl font-bold text-gray-900 truncate">{candidate.name}</h4>
                                    <div className={`w-10 h-10 bg-gradient-to-br ${colorTheme} rounded-full flex items-center justify-center shadow-md mt-1`}>
                                      <span className="text-white text-sm font-bold">{candidate.letter}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 flex-shrink-0">
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Score</div>
                                    <div className="text-4xl font-bold text-gray-900">{totalScore}</div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(celebratingRanks);
                                      if (newSet.has(rank)) {
                                        newSet.delete(rank);
                                      } else {
                                        newSet.add(rank);
                                      }
                                      setCelebratingRanks(newSet);
                                    }}
                                    className={`p-2 rounded-full transition-all ${
                                      isCelebrating
                                        ? 'bg-yellow-300 text-yellow-900 hover:bg-yellow-400'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    title={isCelebrating ? 'Stop celebrating' : 'Celebrate!'}
                                  >
                                    <Sparkles className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-12 bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 rounded-3xl shadow-2xl p-8 text-center border border-purple-700">
                  <div className="text-purple-200 text-sm font-semibold mb-2 uppercase tracking-wider">Combined Total</div>
                  <div className="text-6xl font-bold text-white mb-2">
                    {allRoundScores.reduce((sum, score) => sum + score.score, 0)}
                  </div>
                  <div className="text-purple-300 text-lg">points across {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}</div>
                </div>
              </>
            ) : activeRound ? (
              <>
                <div className="flex justify-end mb-4">
                  {!addingCandidate ? (
                    <button
                      onClick={() => setAddingCandidate(true)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-800 transition-all inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Candidate
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newCandidateLetter}
                        onChange={(e) => setNewCandidateLetter(e.target.value)}
                        placeholder="Letter (e.g., A)"
                        maxLength={1}
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 w-24"
                      />
                      <input
                        type="text"
                        value={newCandidateName}
                        onChange={(e) => setNewCandidateName(e.target.value)}
                        placeholder="Candidate Name"
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && addCandidate()}
                      />
                      <button
                        onClick={addCandidate}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-800 transition-all"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingCandidate(false);
                          setNewCandidateName('');
                          setNewCandidateLetter('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {[...candidates].sort((a, b) => a.letter.localeCompare(b.letter)).map((candidate, index) => {
            const rank = getRanking(candidate.id);
            const badge = getRankingBadge(rank);
            const BadgeIcon = badge?.icon;
            // Assign color based on index to ensure variety
            const colorTheme = colorThemes[index % colorThemes.length];

            return (
            <div
              key={candidate.id}
              className={`bg-gradient-to-br ${colorTheme} rounded-3xl shadow-lg p-6 transition-transform hover:scale-105 relative overflow-hidden`}
            >
              {badge && (
                <div className={`absolute -top-3 -right-3 ${badge.bg} ${badge.text} rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white`}>
                  <div className="flex flex-col items-center">
                    {BadgeIcon && <BadgeIcon className="w-6 h-6" />}
                    <span className="text-xs font-bold">{badge.label}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">{candidate.letter}</span>
                  </div>
                  {editingCandidateName === candidate.id ? (
                    <div className="flex gap-2 min-w-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 rounded text-gray-900 font-semibold text-lg min-w-0"
                        onKeyPress={(e) => e.key === 'Enter' && saveCandidateName(candidate.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => saveCandidateName(candidate.id)}
                        className="px-2 py-1 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCandidateName(null)}
                        className="px-2 py-1 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-600 transition-colors flex-shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-900 text-xl font-semibold truncate">{candidate.name}</span>
                  )}
                </div>
                <button
                  onClick={() => startEditName(candidate.id, candidate.name)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
                >
                  <Pencil className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              <div className="text-center mb-8">
                <div className="text-gray-800 text-sm font-medium mb-2">
                  Total
                </div>
                {editingCandidateScore === candidate.id ? (
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      className="px-3 py-2 rounded text-gray-900 font-bold text-3xl w-32 text-center"
                      onKeyPress={(e) => e.key === 'Enter' && saveCandidateScore(candidate.id)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveCandidateScore(candidate.id)}
                        className="px-3 py-1 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCandidateScore(null)}
                        className="px-3 py-1 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-7xl font-bold text-gray-900">{getCandidateScore(candidate.id)}</span>
                    <button
                      onClick={() => startEditScore(candidate.id)}
                      className="p-2 hover:bg-black/10 rounded-full transition-colors"
                    >
                      <Pencil className="w-6 h-6 text-gray-900" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                {[1, 2, 5, 10].map((points) => (
                  <button
                    key={points}
                    onClick={() => addScore(candidate.id, points)}
                    className="w-14 h-14 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-black/10 transition-all hover:scale-110 active:scale-95"
                  >
                    +{points}
                  </button>
                ))}
              </div>
              <button
                onClick={() => deleteCandidate(candidate.id)}
                className="mt-4 w-full py-1 text-xs bg-gradient-to-r from-red-100 to-orange-100 text-red-700 rounded font-medium hover:from-red-200 hover:to-orange-200 transition-all"
              >
                Remove
              </button>
            </div>
            );
          })}
                </div>
                {candidates.length > 0 && (
                  <div className="text-center bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 shadow-md">
                    <p className="text-2xl font-semibold text-gray-900">
                      Total Score Across All Candidates: {totalScore}
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
