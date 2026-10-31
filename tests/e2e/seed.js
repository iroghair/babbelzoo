(() => {
  if (sessionStorage.getItem("seeded")) return;
  sessionStorage.setItem("seeded", "1");
  const d = (n) => { const t = new Date(); t.setDate(t.getDate() - n); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  localStorage.setItem('babbelzoo.players', JSON.stringify({ list: [{ id: 'p1', name: 'Sanne', avatar: '🦊' }, { id: 'p2', name: 'Daan', avatar: '🐼' }], currentId: 'p1' }));
  localStorage.setItem('babbelzoo.profile.p1', JSON.stringify({
    wallet: { coins: 1260, earned: 3000, food: 2, dayStreak: 4, lastDay: d(1) },
    rooms: ['living', 'garden', 'pond'],
    milestones: { bestGrade: 7.8, masteredLists: [], longestDayStreak: 4 },
    owned: [
      { id: 'a1', animalId: 'fox', name: 'Fien', roomId: 'living', x: 20, y: 45, bought: 1, fedDays: [d(5), d(4), d(3), d(2), d(0)] },
      { id: 'a2', animalId: 'panda', name: 'Bolle', roomId: 'living', x: 46, y: 40, bought: 2, fedDays: [d(0)] },
      { id: 'a3', animalId: 'chick', name: 'Pip', roomId: 'living', x: 34, y: 74, bought: 3, fedDays: [d(3), d(2), d(1)] },
      { id: 'a4', animalId: 'dog', name: 'Kees', roomId: 'living', x: 62, y: 66, bought: 4, fedDays: [d(6), d(5), d(4), d(3), d(2), d(1)] },
      { id: 'a5', animalId: 'owl', name: 'Uil', roomId: 'living', x: 76, y: 40, bought: 5, fedDays: [] },
      { id: 'a6', animalId: 'duck', name: 'Kwak', roomId: 'pond', x: 50, y: 55, bought: 6, fedDays: [d(0)] },
    ],
  }));
})();
