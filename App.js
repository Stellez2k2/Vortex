// @ts-check
import React, {useState, useEffect} from 'react';
import { Picker } from '@react-native-picker/picker';
import { Alert } from "react-native";
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initializeApp } from "firebase/app";
import { set, getDatabase, ref, onValue, push, get, update, remove, onDisconnect } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut} from "firebase/auth";
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native'
;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0uSoxWljgv9EhsHu96dvVGkvf-MzLI9w",
  authDomain: "test-409df.firebaseapp.com",
  databaseURL: "https://test-409df-default-rtdb.firebaseio.com",
  projectId: "test-409df",
  storageBucket: "test-409df.firebasestorage.app",
  messagingSenderId: "211354796439",
  appId: "1:211354796439:web:898e9d4442c89835d5c4d2",
  measurementId: "G-Z15X12BELD"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app);
const Stack = createStackNavigator();

const auth = getAuth();

const usernameToEmail = (username) => `${username}@yourapp.com`;

const signUp = async (username, password) => {
  try {
    const fakeEmail = usernameToEmail(username);
    
    const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    const user = userCredential.user;

    const userId = user.uid;
    await set(ref(database, `players/${userId}`), {
      userId,
      username,
      wins: 0,
      losses: 0,
    });

    Alert.alert("Success", "Account created!");
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};

const login = async (username, password, navigation) => {
  try {
    const fakeEmail = usernameToEmail(username);
    const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
    Alert.alert("Success", "Logged in!");
    navigation.navigate('LobbyList', { username });
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};

const logout = async () => {
  try {
    await signOut(auth);
    Alert.alert("Logged out", "You have signed out.");
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};

const getPlayerInfo = async (userId) => {
  if (!userId) {
    console.log("User ID is undefined");
    return null;
  }

  const playerRef = ref(database, `players/${userId}`);
  const snapshot = await get(playerRef);

  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    console.log("No player data found for userId:", userId);
    return null;
  }
};

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text>Login</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button title="Login" onPress={() => login(username, password, navigation)} />
      <Button title="Sign Up" onPress={() => navigation.navigate('SignUp')} />
    </View>
  );
};


const SignUpScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  return (
    <View style={styles.container}>
      <Text>Sign Up</Text>
      <TextInput 
        placeholder="Username" 
        value={username} 
        onChangeText={setUsername} 
        style={styles.input} 
      />
      <TextInput 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        style={styles.input} 
      />
      <Button title="Create Account" onPress={() => signUp(username, password)} />
      <Button title="Back to Login" onPress={() => navigation.goBack()} />
    </View>
  );
};

const LobbyListScreen = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState({});
  const { username } = route.params;

  const platforms = ['steam', 'playstation', 'xbox', 'switch', 'crossplay'];

  useEffect(() => {
    const lobbiesRef = ref(database, "lobbies/");

    const unsubscribe = onValue(lobbiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGames(data);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderScene = ({ route }) => {
    const platform = route.key;

    const filteredGames = Object.entries(games)
      .map(([id, game]) => ({
        id,
        name: game.name,
        platformData: game.platforms?.[platform] || null,
      }))
      .filter(game => game.platformData && game.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('GameLobby', {
              gameId: item.id,
              gameName: item.name,
              platform,
              username
            })}
          >
            <Text>{item.name} ({platform})</Text>
            <Text>Player Count: {item.platformData.playerCount || 0}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  const [index, setIndex] = useState(0);
  const [routes] = useState(platforms.map(platform => ({ key: platform, title: platform.toUpperCase() })));

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Profile', { username, isOwnProfile: true })}>
        <Text style={styles.username}>Logged in as: {username}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchBar}
        placeholder="Search for a game..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={props => (
          <TabBar
            {...props}
            scrollEnabled
            style={styles.tabBar}
            indicatorStyle={{ backgroundColor: 'white' }}
          />
        )}
      />
    </View>
  );
};

const platforms = ['steam', 'playstation', 'xbox', 'switch'];

const ProfileScreen = ({ route, navigation }) => {
  const { username, isOwnProfile, skillLevel, favoriteGame, currentlyPlaying, totalMatches, wins, losses, platformUsernames: initialPlatformUsernames = {}, rankPoints } = route.params;
  const [editable, setEditable] = useState(isOwnProfile);
  const [newUsername, setNewUsername] = useState(username);
  const [newSkillLevel, setNewSkillLevel] = useState(skillLevel);
  const [newFavoriteGame, setNewFavoriteGame] = useState(favoriteGame);
  const [platformUsernames, setPlatformUsernames] = useState(initialPlatformUsernames);

  useEffect(() => {
    if (!isOwnProfile) return;

    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userId = user.uid;
      const playerRef = ref(database, `players/${userId}`);

      const snapshot = await get(playerRef);
      if (snapshot.exists()) {
        const playerInfo = snapshot.val();
        setNewUsername(playerInfo.username || username);
        setNewSkillLevel(playerInfo.skillLevel || 'Beginner');
        setNewFavoriteGame(playerInfo.favoriteGame || '');
        setPlatformUsernames(playerInfo.platformUsernames || {});
      }
    };

    fetchProfile();
  }, [isOwnProfile]);

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    const userId = user.uid;
    const playerRef = ref(database, `players/${userId}`);

    await update(playerRef, {
      username: newUsername,
      skillLevel: newSkillLevel,
      favoriteGame: newFavoriteGame,
      platformUsernames,
    });

    await AsyncStorage.setItem('username', newUsername);
    await AsyncStorage.setItem('skillLevel', newSkillLevel);
    await AsyncStorage.setItem('favoriteGame', newFavoriteGame);

    Alert.alert('Profile Updated', 'Your profile has been updated.');
    navigation.navigate('LobbyList', { username: newUsername });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.profileContainer}>
        <Text style={styles.profileHeader}>{isOwnProfile ? 'Edit Profile' : `${username}'s Profile`}</Text>

        {editable ? (
          <View style={styles.profileInputContainer}>
            <Text style={styles.profileLabel}>Username:</Text>
            <TextInput
              style={styles.profileInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
            />
          </View>
        ) : (
          <Text style={styles.profileUsername}>{username}</Text>
        )}

        <View style={styles.profileInputContainer}>
          <Text style={styles.profileLabel}>Skill Level:</Text>
          {editable ? (
            <Picker
              selectedValue={newSkillLevel}
              style={styles.profilePicker}
              onValueChange={(itemValue) => setNewSkillLevel(itemValue)}
            >
              <Picker.Item label="Beginner" value="Beginner" />
              <Picker.Item label="Intermediate" value="Intermediate" />
              <Picker.Item label="Expert" value="Expert" />
            </Picker>
          ) : (
            <Text style={styles.profileUsername}>{skillLevel}</Text>
          )}
        </View>

        <View style={styles.profileInputContainer}>
          <Text style={styles.profileLabel}>Favorite Game:</Text>
          {editable ? (
            <TextInput
              style={styles.profileInput}
              value={newFavoriteGame}
              onChangeText={setNewFavoriteGame}
              placeholder="Enter your favorite game"
            />
          ) : (
            <Text style={styles.profileUsername}>{favoriteGame}</Text>
          )}
        </View>

        {!isOwnProfile && (
        <View style={styles.profileStatsContainer}>
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileLabel}>Wins:</Text>
            <Text style={styles.profileUsername}>{wins}</Text>
          </View>
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileLabel}>Losses:</Text>
            <Text style={styles.profileUsername}>{losses}</Text>
          </View>
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileLabel}>Rank Points:</Text>
            <Text style={styles.profileUsername}>{rankPoints}</Text>
          </View>
        </View>
      )}


        <Text style={styles.profileHeader}>Platform Usernames</Text>
        {platforms.map((platform) => (
          <View key={platform} style={styles.profileInputContainer}>
            <Text style={styles.profileLabel}>{platform} ID:</Text>
            {editable ? (
              <TextInput
                style={styles.profileInput}
                value={platformUsernames[platform] || ''}
                onChangeText={(text) => setPlatformUsernames({ ...platformUsernames, [platform]: text })}
                placeholder={`Enter your ${platform} ID`}
                editable={editable}
              />
            ) : (
              <Text style={styles.profileUsername}>
                {platformUsernames[platform] || 'Not Set'}
              </Text>
            )}
          </View>
        ))}

        {isOwnProfile && (
          <Button title={editable ? "Save" : "Edit Profile"} onPress={editable ? saveProfile : () => setEditable(true)} />
        )}
      </View>
    </ScrollView>
  );
};

const GameLobbyScreen = ({ route, navigation }) => {
  const { gameId, gameName, username, platform } = route.params;
  const [playerCount, setPlayerCount] = useState(0);
  const [skillLevel, setSkillLevel] = useState("Beginner");
  const [gameMode, setGameMode] = useState("Casual");

  const [matchmakingModalVisible, setMatchmakingModalVisible] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [pendingMatchModalVisible, setPendingMatchModalVisible] = useState(false);
  const [postMatchModalVisible, setPostMatchModalVisible] = useState(false);

  const [platformId, setPlatformId] = useState("");
  const [isPlatformIdModalVisible, setIsPlatformIdModalVisible] = useState(false);

  const [opponentUsername, setOpponentUsername] = useState("");
  const [opponentPlatformId, setOpponentPlatformId] = useState("");

  const [pendingMatch, setPendingMatch] = useState(null);

  const [pendingResults, setPendingResults] = useState([]);

  const [rankPoints, setRankPoints] = useState(0);
  const [lobbyPeakPlayers, setLobbyPeakPlayers] = useState(0);

  const lobbyRef = ref(database, `lobbies/${gameId}/platforms/${platform}`);
  const playersRef = ref(database, `lobbies/${gameId}/platforms/${platform}/players`);
  const queueRef = ref(database, `lobbies/${gameId}/platforms/${platform}/queue`);
  const pendingMatchesRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches`);
  const playerStatsBaseRef = ref(database, `lobbies/${gameId}/platforms/${platform}/playerStats`);

  useEffect(() => {
    const logPlayerCount = () => {
      const timestamp = Date.now();
      const logRef = ref(database, `lobbies/${gameId}/platforms/${platform}/playerStats/${timestamp}`);
      set(logRef, {
        timestamp,
        count: playerCount,
      });
    };

    const interval = setInterval(logPlayerCount, 300000);
    return () => clearInterval(interval);
  }, [gameId, platform, playerCount]);

  useEffect(() => {
    const twentyFourHoursAgo = Date.now() - 86400000;
    const statsRef = ref(database, `lobbies/${gameId}/platforms/${platform}/playerStats`);

    get(statsRef).then((snapshot) => {
      const data = snapshot.val() || {};
      let peakCount = 0;

      Object.values(data).forEach((entry) => {
        if (entry.timestamp >= twentyFourHoursAgo) {
          peakCount = Math.max(peakCount, entry.count);
        }
      });

      setLobbyPeakPlayers(peakCount);
    });
  }, [gameId, platform]);

  useEffect(() => {
    const cleanOldPlayerStats = async () => {
      const twentyFourHoursAgo = Date.now() - 86400000;
      const statsRef = ref(database, `lobbies/${gameId}/platforms/${platform}/playerStats`);

      get(statsRef).then((snapshot) => {
        const data = snapshot.val() || {};
        Object.keys(data).forEach(async (key) => {
          if (data[key].timestamp < twentyFourHoursAgo) {
            await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/playerStats/${key}`));
          }
        });
      });
    };

    cleanOldPlayerStats();
  }, [gameId, platform]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const platformIdRef = ref(database, `players/${userId}/platformUsernames/${platform}`);
  
    get(platformIdRef).then((snapshot) => {
      const existingPlatformId = snapshot.val();
      if (existingPlatformId) {
        setPlatformId(existingPlatformId);
      } else {
        setIsPlatformIdModalVisible(true);
      }
    });
  }, [platform]);

  const PlatformIdModal = ({ visible, onSubmit }) => {
    const [tempPlatformId, setTempPlatformId] = useState("");
  
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>Please enter your Platform ID to continue:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Platform ID"
              value={tempPlatformId}
              onChangeText={setTempPlatformId}
            />
            <Button title="Submit" onPress={() => onSubmit(tempPlatformId)} disabled={!tempPlatformId} />
          </View>
        </View>
      </Modal>
    );
  };

  const handlePlatformIdSubmit = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
  
    const platformIdRef = ref(database, `players/${userId}/platformUsernames/${platform}`);
    await set(platformIdRef, id);
  
    setPlatformId(id);
    setIsPlatformIdModalVisible(false);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const playerRef = ref(database, `players/${userId}/lobbyStats/${gameId}`);
    const unsubscribe = onValue(playerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRankPoints(data.rankPoints || 0);
      }
    });
    return () => unsubscribe();
  }, [gameId, platform]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const playerRef = ref(database, `lobbies/${gameId}/platforms/${platform}/players/${userId}`);
    
    getPlayerInfo(userId).then((info) => {
      const data = info || { username };
      set(playerRef, {
        userId,
        username: data.username,
        skillLevel: data.skillLevel || "Beginner",
        favoriteGame: data.favoriteGame || "Unknown",
        platformUsernames: data.platformUsernames || {},
        totalMatches: data.totalMatches || 0,
        wins: data.wins || 0,
        losses: data.losses || 0,
      });
      onDisconnect(playerRef).remove();
    });

    const lobbyStatsRef = ref(database, `players/${userId}/lobbyStats/${gameId}`);
    get(lobbyStatsRef).then((snapshot) => {
      if (!snapshot.exists()) {
        set(lobbyStatsRef, {
          wins: 0,
          losses: 0,
          rankPoints: 0,
        });
      } else {
        update(playerRef, snapshot.val());
      }
    });
    
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const count = Object.keys(players).length;
      setPlayerCount(count);
      update(lobbyRef, { playerCount: count });
    });
    
    return () => {
      remove(playerRef);
      unsubscribe();
    };
  }, [gameId, platform]);

  // --- Queue Logic ---
  const findMatch = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;

    const snapshot = await get(queueRef);
    const queue = snapshot.val() || {};
  
    const opponent = Object.entries(queue).find(([id, player]) =>
      player.skillLevel === skillLevel &&
      player.gameMode === gameMode &&
      id !== userId
    );
  
    if (opponent) {
      const [opponentId] = opponent;
      const matchId = `${userId}_${opponentId}`;
      const pendingMatchRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}`);
  
      await set(pendingMatchRef, {
        player1: userId,
        player2: opponentId,
        status: "waiting",
        acceptedBy: [],
      });
  
      await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/queue/${opponentId}`));
      await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/queue/${userId}`));
  
      setQueueModalVisible(false);
    } else {
      await set(ref(database, `lobbies/${gameId}/platforms/${platform}/queue/${userId}`), {
        userId,
        skillLevel,
        gameMode,
      });
      setQueueModalVisible(true);
    }
  };
  
  const cancelQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/queue/${userId}`));
    setQueueModalVisible(false);
    Alert.alert("Queue Cancelled", "You have left the matchmaking queue.");
  };
  
  // --- Pending Match Listener ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
  
    const unsubscribe = onValue(pendingMatchesRef, (snapshot) => {
      const matches = snapshot.val();
      if (!matches) {
        setPendingMatch(null);
        setPendingMatchModalVisible(false);
        setOpponentUsername(""); 
        setOpponentPlatformId("");
        return;
      }
  
      const matchEntry = Object.entries(matches).find(([matchId, match]) => 
        match.player1 === userId || match.player2 === userId
      );
  
      if (matchEntry) {
        const [matchId, match] = matchEntry;
        setPendingMatch(match);
        setPendingMatchModalVisible(true);
  
        const opponentId = match.player1 === userId ? match.player2 : match.player1;
  
        const opponentRef = ref(database, `players/${opponentId}/username`);
        get(opponentRef).then((snapshot) => {
          if (snapshot.exists()) {
            setOpponentUsername(snapshot.val());
          } else {
            setOpponentUsername("Unknown Player");
          }
        });
  
        const platformRef = ref(database, `players/${opponentId}/platformUsernames/${platform}`);
        get(platformRef).then((snapshot) => {
          if (snapshot.exists()) {
            setOpponentPlatformId(snapshot.val());
          } else {
            setOpponentPlatformId("No Platform ID Set");
          }
        });
  
        setQueueModalVisible(false);
      } else {
        setPendingMatch(null);
        setPendingMatchModalVisible(false);
        setOpponentUsername(""); 
        setOpponentPlatformId("");
      }
    });
  
    return () => unsubscribe();
  }, [gameId, platform]);
  
  // --- Accept/Decline Pending Match ---
  const acceptMatch = async () => {
    const user = auth.currentUser;
    if (!user || !pendingMatch) return;
  
    const matchId = `${pendingMatch.player1}_${pendingMatch.player2}`;
    const matchRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}`);
    const snapshot = await get(matchRef);
    const match = snapshot.val();
  
    if (match) {
      const acceptedBy = match.acceptedBy || [];
      if (!acceptedBy.includes(user.uid)) {
        acceptedBy.push(user.uid);
        await update(matchRef, { acceptedBy });
  
        if (acceptedBy.length === 2) {
          await update(matchRef, { status: "accepted" });
        }
      }
    }
  };

const declineMatch = async () => {
  const user = auth.currentUser;
  if (!user || !pendingMatch) return;
  const matchId = `${pendingMatch.player1}_${pendingMatch.player2}`;
  await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}`));
  setPendingMatch(null);
  setPendingMatchModalVisible(false);
  Alert.alert("Match Declined", "You declined the match.");
};

  // --- Submit Results (Ranked only) ---
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitResults = async (results) => {
    const user = auth.currentUser;
    if (!user || !pendingMatch) return;
    const matchId = `${pendingMatch.player1}_${pendingMatch.player2}`;
    const matchRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}`);
  
    await submitMatchResults(results);
  
    setPostMatchModalVisible(false);
    setPendingMatch(null);
  
    const resultsRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}/results`);
    const snapshot = await get(resultsRef);
    const resultsData = snapshot.val();
  
    if (resultsData && resultsData[pendingMatch.player1] && resultsData[pendingMatch.player2]) {
      await checkResults();
      await remove(matchRef);
    } else {
      Alert.alert("Results Submitted", "Waiting for your opponent to submit their results.");
    }
  };
  
  const submitMatchResults = async (results) => {
    const user = auth.currentUser;
    if (!user || !pendingMatch) return;
    const matchId = `${pendingMatch.player1}_${pendingMatch.player2}`;
    const resultsRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}/results/${user.uid}`);
    await set(resultsRef, results);
  };
  
  const checkResults = async () => {
    const matchId = `${pendingMatch.player1}_${pendingMatch.player2}`;
    const resultsRef = ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${matchId}/results/`);
    const snapshot = await get(resultsRef);
    const resultsData = snapshot.val();
    if (!resultsData) return;
    
    if (!resultsData[pendingMatch.player1] || !resultsData[pendingMatch.player2]) return;
    
    const rounds = ["round1", "round2", "round3"];
    let wins1 = 0, losses1 = 0, wins2 = 0, losses2 = 0;
    
    rounds.forEach((round) => {
      const r1 = resultsData[pendingMatch.player1][round];
      const r2 = resultsData[pendingMatch.player2][round];
      if (r1 !== "N/A" && r2 !== "N/A") {
        if (r1 === "win" && r2 === "loss") {
          wins1++;
          losses2++;
        } else if (r1 === "loss" && r2 === "win") {
          losses1++;
          wins2++;
        }
      }
    });
    
    await updateLobbyStats(pendingMatch.player1, wins1, losses1);
    await updateLobbyStats(pendingMatch.player2, wins2, losses2);
  };
  
  const updatePlayerStats = async (userId, result) => {
    const playerRef = ref(database, `players/${userId}`);
    const snapshot = await get(playerRef);
    const player = snapshot.val();
    if (player) {
      if (result === "win") {
        await update(playerRef, { wins: (player.wins || 0) + 1 });
      } else if (result === "loss") {
        await update(playerRef, { losses: (player.losses || 0) + 1 });
      }
    }
  };

  const updatePlayerStatsCombined = async (userId, winsToAdd, lossesToAdd) => {
    const globalPlayerRef = ref(database, `players/${userId}`);
    const globalSnapshot = await get(globalPlayerRef);
    const globalPlayer = globalSnapshot.val();
    if (globalPlayer) {
      const newWins = (globalPlayer.wins || 0) + winsToAdd;
      const newLosses = (globalPlayer.losses || 0) + lossesToAdd;
      const newRankPoints = (globalPlayer.rankPoints || 0) + winsToAdd * 10 - lossesToAdd * 5;
      await update(globalPlayerRef, {
        wins: newWins,
        losses: newLosses,
        rankPoints: newRankPoints,
      });
    }


  
    const lobbyPlayerRef = ref(database, `lobbies/${gameId}/players/${userId}`);
    const lobbySnapshot = await get(lobbyPlayerRef);
    const lobbyPlayer = lobbySnapshot.val();
    if (lobbyPlayer) {
      const newWins = (lobbyPlayer.wins || 0) + winsToAdd;
      const newLosses = (lobbyPlayer.losses || 0) + lossesToAdd;
      const newRankPoints = (lobbyPlayer.rankPoints || 0) + winsToAdd * 10 - lossesToAdd * 5;
      await update(lobbyPlayerRef, {
        wins: newWins,
        losses: newLosses,
        rankPoints: newRankPoints,
      });
    }
  };

  const updateLobbyStats = async (userId, winsToAdd, lossesToAdd) => {
    const ephemeralRef = ref(database, `lobbies/${gameId}/platforms/${platform}players/${userId}`);
    const persistentRef = ref(database, `players/${userId}/lobbyStats/${gameId}`);
  
    const ephemeralSnap = await get(ephemeralRef);
    const ephemeralData = ephemeralSnap.val() || {};
    const newEphemeralWins = (ephemeralData.wins || 0) + winsToAdd;
    const newEphemeralLosses = (ephemeralData.losses || 0) + lossesToAdd;
    const newEphemeralRankPoints = (ephemeralData.rankPoints || 0) + winsToAdd * 10 - lossesToAdd * 5;
    await update(ephemeralRef, {
      wins: newEphemeralWins,
      losses: newEphemeralLosses,
      rankPoints: newEphemeralRankPoints,
    });
  
    const persistentSnap = await get(persistentRef);
    const persistentData = persistentSnap.val() || {};
    const newPersistentWins = (persistentData.wins || 0) + winsToAdd;
    const newPersistentLosses = (persistentData.losses || 0) + lossesToAdd;
    const newPersistentRankPoints = (persistentData.rankPoints || 0) + winsToAdd * 10 - lossesToAdd * 5;
    await update(persistentRef, {
      wins: newPersistentWins,
      losses: newPersistentLosses,
      rankPoints: newPersistentRankPoints,
    });
  };

  

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const resultsListener = onValue(pendingMatchesRef, (snapshot) => {
      const matches = snapshot.val();
      const pending = [];
      if (matches) {
        Object.entries(matches).forEach(([matchId, match]) => {
          if (
            match.status === "accepted" &&
            match.results &&
            match.results[userId] && 
            !match.results[match.player1 === userId ? match.player2 : match.player1]
          ) {
            pending.push({ matchId, ...match });
          }
        });
      }
      setPendingResults(pending);
    });
    return () => resultsListener();
  }, [gameId]);


  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{gameName} Lobby ({platform.toUpperCase()})</Text>
      <View style={styles.lobbyStatsContainer}>
      <Text style={styles.lobbyStatsText}>Players in Lobby: {playerCount}</Text>
      <Text style={styles.lobbyStatsText}>Your Rank Points: {rankPoints}</Text>
      <Text style={styles.lobbyStatsText}>Peak Player Count in Last 24 Hours: {lobbyPeakPlayers}</Text>
    </View>
    <View style={styles.buttonContainer}>
      <Button
        title="Matchmaking Preferences"
        onPress={() => setMatchmakingModalVisible(true)}
        style={styles.button}
      />
      <Button
        title="View Player List"
        onPress={() => navigation.navigate("PlayerList", { gameId, platform })}
        style={styles.button}
      />
      <Button
        title="View Stats"
        onPress={() => navigation.navigate("Stats", { gameId, platform })}
        style={styles.button}
      />
      <Button
        title="Back to Lobby List"
        onPress={() => navigation.goBack()}
        style={styles.button}
      />
    </View>

      <PlatformIdModal visible={isPlatformIdModalVisible} onSubmit={handlePlatformIdSubmit} />

      <MatchmakingModal
        visible={matchmakingModalVisible}
        onClose={() => setMatchmakingModalVisible(false)}
        onFindMatch={findMatch}
        skillLevel={skillLevel}
        setSkillLevel={setSkillLevel}
        gameMode={gameMode}
        setGameMode={setGameMode}
      />

      <QueueModal visible={queueModalVisible} onCancel={cancelQueue} />

      {pendingMatchModalVisible && pendingMatch && (
  <PendingMatchModal
    visible={pendingMatchModalVisible}
    pendingMatch={pendingMatch}
    opponentUsername={opponentUsername}
    opponentPlatformId={opponentPlatformId}
    onAccept={acceptMatch}
    onDecline={declineMatch}
    onProceed={() => {
      if (gameMode === "Ranked") {
        setPostMatchModalVisible(true);
      } else {
        setPendingMatchModalVisible(false);
        setPendingMatch(null);
      }
    }}
  />
)}

      {postMatchModalVisible && gameMode === "Ranked" && (
        <PostMatchResultsModal
          visible={postMatchModalVisible}
          onClose={() => setPostMatchModalVisible(false)}
          onSubmitResult={submitResults}
        />
      )}

{pendingResults.length > 0 && (
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontWeight: "bold" }}>Pending Match Results:</Text>
    <FlatList
      data={pendingResults}
      keyExtractor={(item) => item.matchId}
      renderItem={({ item }) => {
        const opponent = item.player1 === auth.currentUser.uid ? item.player2 : item.player1;
        const myResults = item.results ? item.results[auth.currentUser.uid] : null;
        return (
          <View style={styles.pendingResultItem}>
            <Text>Opponent: {opponent}</Text>
            {myResults ? (
              <Text>Your Results: {myResults.round1}, {myResults.round2}, {myResults.round3}</Text>
            ) : (
              <Text>No results submitted yet.</Text>
            )}
            <Button
              title="Clear Pending Result"
              onPress={async () => {
                await remove(ref(database, `lobbies/${gameId}/platforms/${platform}/pendingMatches/${item.matchId}`));
                setPendingResults((prev) => prev.filter((m) => m.matchId !== item.matchId));
              }}
            />
          </View>
        );
      }}
    />
  </View>
)}

    </View>
  );
};

// --- Modal Components ---

const MatchmakingModal = ({ visible, onClose, onFindMatch, skillLevel, setSkillLevel, gameMode, setGameMode }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalHeader}>Matchmaking Preferences</Text>
        <Text>Skill Level:</Text>
        <Picker selectedValue={skillLevel} onValueChange={setSkillLevel}>
          <Picker.Item label="Beginner" value="Beginner" />
          <Picker.Item label="Intermediate" value="Intermediate" />
          <Picker.Item label="Expert" value="Expert" />
        </Picker>
        <Text>Game Mode:</Text>
        <Picker selectedValue={gameMode} onValueChange={setGameMode}>
          <Picker.Item label="Casual" value="Casual" />
          <Picker.Item label="Ranked" value="Ranked" />
        </Picker>
        <Button title="Find Match" onPress={() => { onFindMatch(); onClose(); }} />
        <Button title="Cancel" onPress={onClose} color="red" />
      </View>
    </View>
  </Modal>
);

const QueueModal = ({ visible, onCancel }) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text>You are in the queue...</Text>
        <Button title="Cancel Queue" onPress={onCancel} color="red" />
      </View>
    </View>
  </Modal>
);

const PendingMatchModal = ({ visible, pendingMatch, opponentUsername, opponentPlatformId, onAccept, onDecline, onProceed }) => {
  if (!pendingMatch) return null;
  const user = auth.currentUser;
  if (!user) return null;

  const isAccepted = pendingMatch.acceptedBy && pendingMatch.acceptedBy.length === 2;
  const opponentId = pendingMatch.player1 === user.uid ? pendingMatch.player2 : pendingMatch.player1;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {!isAccepted ? (
            <>
              <Text>Match found! Waiting for both players to accept.</Text>
              <Text>Opponent: {opponentUsername}</Text>
              <Button title="Accept" onPress={onAccept} />
              <Button title="Decline" onPress={onDecline} color="red" />
            </>
          ) : (
            <>
              <Text>Both players accepted!</Text>
              <Text>Opponent’s Platform ID: {opponentPlatformId}</Text>
              <Button title="Proceed to Submit Results" onPress={onProceed} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const PostMatchResultsModal = ({ visible, onClose, onSubmitResult }) => {
  const [results, setResults] = useState({ round1: "N/A", round2: "N/A", round3: "N/A" });
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text>Enter your match results</Text>
          <Text>Round 1:</Text>
          <Picker
            selectedValue={results.round1}
            onValueChange={(val) => setResults((prev) => ({ ...prev, round1: val }))}
          >
            <Picker.Item label="Win" value="win" />
            <Picker.Item label="Loss" value="loss" />
            <Picker.Item label="N/A" value="N/A" />
          </Picker>
          <Text>Round 2:</Text>
          <Picker
            selectedValue={results.round2}
            onValueChange={(val) => setResults((prev) => ({ ...prev, round2: val }))}
          >
            <Picker.Item label="Win" value="win" />
            <Picker.Item label="Loss" value="loss" />
            <Picker.Item label="N/A" value="N/A" />
          </Picker>
          <Text>Round 3:</Text>
          <Picker
            selectedValue={results.round3}
            onValueChange={(val) => setResults((prev) => ({ ...prev, round3: val }))}
          >
            <Picker.Item label="Win" value="win" />
            <Picker.Item label="Loss" value="loss" />
            <Picker.Item label="N/A" value="N/A" />
          </Picker>
          <Button title="Submit Results" onPress={() => onSubmitResult(results)} />
          <Button title="Cancel" onPress={onClose} color="red" />
        </View>
      </View>
    </Modal>
  );
};


const PlayerListScreen = ({ route, navigation }) => {
  const { gameId, platform } = route.params;
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const playersRef = ref(database, `lobbies/${gameId}/platforms/${platform}/players`);

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const playerArray = Object.entries(data).map(([id, player]) => ({
          id,
          ...player,
        }));
        setPlayers(playerArray);
      } else {
        setPlayers([]);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Player List</Text>
      <FlatList
        data={players}
        keyExtractor={(player) => player.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playerItem}
            onPress={() =>
              navigation.navigate("Profile", {
                username: item.username,
                isOwnProfile: false,
                skillLevel: item.skillLevel,
                favoriteGame: item.favoriteGame,
                totalMatches: item.totalMatches,
                wins: item.wins,
                losses: item.losses,
                platformUsernames: item.platformUsernames || {},
                rankPoints: item.rankPoints,
              })
            }
          >
            <View style={styles.playerRow}>
              <Text style={styles.playerName}>{item.username}</Text>
              <Text style={styles.playerRank}>Rank: {item.rankPoints}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
const StatsScreen = () => {
  const route = useRoute();
  const { gameId, platform } = route.params;

  const [totalPlayers, setTotalPlayers] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [peak24h, setPeak24h] = useState(0);
  const [highestRank, setHighestRank] = useState(null);
  const [lowestRank, setLowestRank] = useState(null);
  const [averageRank, setAverageRank] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [queues, setQueues] = useState({
    casual: { beginner: 0, intermediate: 0, expert: 0 },
    ranked: { beginner: 0, intermediate: 0, expert: 0 },
  });

  useEffect(() => {
    const totalPlayersRef = ref(database, "players");
    const unsubscribe = onValue(totalPlayersRef, (snapshot) => {
      let count = 0;
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.lobbyStats && data.lobbyStats[gameId]) {
          count++;
        }
      });
      setTotalPlayers(count);
    });
    return () => unsubscribe();
  }, [gameId]);

  useEffect(() => {
    const onlinePlayersRef = ref(
      database,
      `lobbies/${gameId}/platforms/${platform}/players`
    );
    const unsubscribeOnline = onValue(onlinePlayersRef, async (snapshot) => {
      const players = snapshot.val() || {};
      const count = Object.keys(players).length;
      setOnlinePlayers(count);

      const peak24hRef = ref(
        database,
        `lobbies/${gameId}/platforms/${platform}/peak24h`
      );
      get(peak24hRef).then((snap) => {
        const currentPeak = snap.val() || 0;
        if (count > currentPeak) {
          set(peak24hRef, count);
        }
      });

      let highest = -Infinity;
      let lowest = Infinity;
      let totalRankPoints = 0;
      let countPlayers = 0;
      const playerRanks = [];

      const usernamePromises = Object.entries(players).map(async ([userId, playerData]) => {
        const rankPoints = playerData.rankPoints || 0;
        totalRankPoints += rankPoints;
        countPlayers++;
        if (rankPoints > highest) highest = rankPoints;
        if (rankPoints < lowest) lowest = rankPoints;

        const usernameRef = ref(database, `lobbies/${gameId}/platforms/${platform}/players/${userId}/username`);
        const usernameSnapshot = await get(usernameRef);
        const username = usernameSnapshot.val() || "Unknown";

        playerRanks.push({ username, rankPoints });
      });

      await Promise.all(usernamePromises);

      const computedHighest = countPlayers > 0 ? highest : "N/A";
      const computedLowest = countPlayers > 0 ? lowest : "N/A";
      const computedAverage =
        countPlayers > 0
          ? (totalRankPoints / countPlayers).toFixed(2)
          : "N/A";

      playerRanks.sort((a, b) => b.rankPoints - a.rankPoints);
      const top5 = playerRanks.slice(0, 5);

      setHighestRank(computedHighest);
      setLowestRank(computedLowest);
      setAverageRank(computedAverage);
      setTopPlayers(top5);

      const rankStatsRef = ref(
        database,
        `lobbies/${gameId}/platforms/${platform}/rankStats`
      );
      set(rankStatsRef, {
        highestRank: computedHighest,
        lowestRank: computedLowest,
        averageRank: computedAverage,
      });
    });
    return () => unsubscribeOnline();
  }, [gameId, platform]);

  useEffect(() => {
    const peak24hRef = ref(
      database,
      `lobbies/${gameId}/platforms/${platform}/peak24h`
    );
    const unsubscribePeak = onValue(peak24hRef, (snapshot) => {
      setPeak24h(snapshot.val() || 0);
    });
    return () => unsubscribePeak();
  }, [gameId]);

  useEffect(() => {
    const queuesRef = ref(database, `lobbies/${gameId}/platforms/${platform}/queue`);
    const unsubscribeQueues = onValue(queuesRef, (snapshot) => {
      const queueData = snapshot.val() || {};
      const updatedQueues = {
        casual: { beginner: 0, intermediate: 0, expert: 0 },
        ranked: { beginner: 0, intermediate: 0, expert: 0 },
      };

      Object.entries(queueData).forEach(([queueId, queueInfo]) => {
        const { gameMode, skillLevel } = queueInfo;
        if (gameMode === "Casual") {
          updatedQueues.casual[skillLevel.toLowerCase()] += 1;
        } else if (gameMode === "Ranked") {
          updatedQueues.ranked[skillLevel.toLowerCase()] += 1;
        }
      });

      setQueues(updatedQueues);
    });
    return () => unsubscribeQueues();
  }, [gameId, platform]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lobby Stats</Text>
  
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Total Players: {totalPlayers}</Text>
        <Text style={styles.statsText}>Online Players: {onlinePlayers}</Text>
        <Text style={styles.statsText}>24 Hour Peak: {peak24h}</Text>
        <Text style={styles.statsText}>Highest Rank Points: {highestRank}</Text>
        <Text style={styles.statsText}>Lowest Rank Points: {lowestRank}</Text>
        <Text style={styles.statsText}>Average Rank Points: {averageRank}</Text>
      </View>
  
      <Text style={styles.header}>Top 5 Players</Text>
      <View style={styles.topPlayersContainer}>
        {topPlayers.map((player, index) => (
          <View key={index} style={styles.topPlayerItem}>
            <Text style={styles.topPlayerText}>
              #{index + 1}: {player.username} - {player.rankPoints} Points
            </Text>
          </View>
        ))}
      </View>
  
      <Text style={styles.header}>Current Queues</Text>
      <View style={styles.queuesContainer}>
        <View style={styles.queueColumn}>
          <Text style={styles.queueHeader}>Casual</Text>
          <Text style={styles.queueText}>Beginner: {queues.casual.beginner}</Text>
          <Text style={styles.queueText}>Intermediate: {queues.casual.intermediate}</Text>
          <Text style={styles.queueText}>Expert: {queues.casual.expert}</Text>
        </View>
        <View style={styles.queueColumn}>
          <Text style={styles.queueHeader}>Ranked</Text>
          <Text style={styles.queueText}>Beginner: {queues.ranked.beginner}</Text>
          <Text style={styles.queueText}>Intermediate: {queues.ranked.intermediate}</Text>
          <Text style={styles.queueText}>Expert: {queues.ranked.expert}</Text>
        </View>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'SignUp' }} />
        <Stack.Screen name="LobbyList" component={LobbyListScreen} options={{ title: 'Game Lobbies' }} />
        <Stack.Screen name="GameLobby" component={GameLobbyScreen} options={{ title: 'Lobby' }}/>
        <Stack.Screen name="PlayerList" component={PlayerListScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chatInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'blue',
    marginBottom: 20,
  },

  profileContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
  },
  profileHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  profileInputContainer: {
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  profileInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  profilePicker: {
    height: 50,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  profileUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  playerItem: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tabBar: {
    backgroundColor: '#444',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerRank: {
    fontSize: 14,
    color: '#888',
    marginLeft: 10,
  },

  profileStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profileStatsItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  queuesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  queueColumn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  queueHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  queueText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  queueCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  topPlayersContainer: {
    marginBottom: 20,
  },
  topPlayerItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  topPlayerText: {
    fontSize: 16,
    color: '#333',
  },

  lobbyStatsContainer: {
    marginBottom: 20,
  },
  lobbyStatsText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  button: {
    marginVertical: 10,
    paddingVertical: 12,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    borderColor: '#005bb5',
    borderWidth: 1,
    color: '#fff',
    fontWeight: 'bold',
  },
});
