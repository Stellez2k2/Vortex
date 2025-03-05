// @ts-check
import React, {useState, useEffect} from 'react';
import { Picker } from '@react-native-picker/picker';
import { Alert } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initializeApp } from "firebase/app";
import { set, getDatabase, ref, onValue, push, get, update, remove, onDisconnect } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut} from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
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

// Convert username into a unique "email"
const usernameToEmail = (username) => `${username}@yourapp.com`;

// Sign Up (Username Instead of Email)
const signUp = async (username, password) => {
  try {
    const fakeEmail = usernameToEmail(username);
    
    // Create user with a fake email
    const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    const user = userCredential.user;

    // Store username separately in the database
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

// Login (Username Instead of Email)
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

// Logout
const logout = async () => {
  try {
    await signOut(auth);
    Alert.alert("Logged out", "You have signed out.");
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};

// Get Player Info
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

// Login Screen with Username Instead of Email
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
  const [games, setGames] = useState([]);
  const { username } = route.params;

  useEffect(() => {
    const lobbiesRef = ref(database, "lobbies/");

    const unsubscribe = onValue(lobbiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lobbyArray = Object.entries(data).map(([id, lobby]) => ({
          id,
          ...lobby
        }));
        setGames(lobbyArray);
      }
    });

    return () => unsubscribe();
  }, []);

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

      <FlatList
        data={games.filter(game => game.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('GameLobby', {
              gameId: item.id,
              gameName: item.name,
              username
            })}
          >
            <Text>{item.name}</Text>
            <Text>Player Count: {item.playerCount}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const ProfileScreen = ({ route, navigation }) => {
  const { username, isOwnProfile, skillLevel, favoriteGame, currentlyPlaying, totalMatches, wins, losses } = route.params;
  const [editable, setEditable] = useState(isOwnProfile);
  const [newUsername, setNewUsername] = useState(username);
  const [newSkillLevel, setNewSkillLevel] = useState(skillLevel);
  const [newFavoriteGame, setNewFavoriteGame] = useState(favoriteGame);

  const saveProfile = async () => {
    await AsyncStorage.setItem('username', newUsername);
    await AsyncStorage.setItem('skillLevel', newSkillLevel);
    await AsyncStorage.setItem('favoriteGame', newFavoriteGame);

    Alert.alert('Profile Updated', `Your profile has been updated.`);
    navigation.navigate('LobbyList', { username: newUsername });
  };

  return (
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

      <View style={styles.profileInputContainer}>
        <Text style={styles.profileLabel}>Currently Playing:</Text>
        <Text style={styles.profileUsername}>{currentlyPlaying}</Text>
      </View>

      <View style={styles.profileInputContainer}>
        <Text style={styles.profileLabel}>Total Matches:</Text>
        <Text style={styles.profileUsername}>{totalMatches}</Text>
      </View>

      <View style={styles.profileInputContainer}>
        <Text style={styles.profileLabel}>Wins:</Text>
        <Text style={styles.profileUsername}>{wins}</Text>
      </View>

      <View style={styles.profileInputContainer}>
        <Text style={styles.profileLabel}>Losses:</Text>
        <Text style={styles.profileUsername}>{losses}</Text>
      </View>

      {isOwnProfile && (
        <Button title={editable ? "Save" : "Edit Profile"} onPress={editable ? saveProfile : () => setEditable(true)} />
      )}
    </View>
  );
};


const GameLobbyScreen = ({ route, navigation }) => {
  const { gameId, gameName, username } = route.params;
  const lobbyRef = ref(database, `lobbies/${gameId}/playerCount`);
  const userId = Date.now().toString();
  const gameLobbyRef = ref(database, `lobbies/${gameId}`);

  const getUserId = async () => {
    let storedId = await AsyncStorage.getItem('userId');
    if (!storedId) {
      storedId = Date.now().toString();
      await AsyncStorage.setItem('userId', storedId);
    }
    return storedId;
  };

  useEffect(() => {
    const playerRef = ref(database, `lobbies/${gameId}/players/${userId}`);
    const playersRef = ref(database, `lobbies/${gameId}/players`);
    const gameLobbyRef = ref(database, `lobbies/${gameId}`);
  
    // Add player to the lobby
    set(playerRef, { userId, username }).then(() => {
      onDisconnect(playerRef).remove(); // Auto-remove on disconnect
    });
  
    // Listen for player count updates
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const playerData = snapshot.val();
      const playerCount = playerData ? Object.keys(playerData).length : 0;
  
      update(gameLobbyRef, { playerCount });
    });
  
    // Cleanup on unmount
    return () => {
      remove(playerRef); // Ensure player is removed on component unmount
      unsubscribe();
    };
  }, [gameId]);

  useEffect(() => {
    const matchCheck = onValue(lobbyRef, (snapshot) => {
      const queue = snapshot.val();
      if (queue && Object.keys(queue).includes(userId)) {
        Alert.alert("Match Found!", "You have been matched with another player.");
        remove(ref(database, `lobbies/${gameId}/queue/${userId}`)); // Remove user after matching
      }
    });

    return () => matchCheck();
  }, [gameId]);

  const findMatch = async () => {
    const queueRef = ref(database, `lobbies/${gameId}/queue`);
    const snapshot = await get(queueRef);
    const queue = snapshot.val();
    
    if (queue) {
      const queuePlayers = Object.keys(queue);
      
      if (queuePlayers.length > 0) {
        const opponentId = queuePlayers[0]; // Match with first in queue
        await remove(ref(database, `lobbies/${gameId}/queue/${opponentId}`));
        await remove(ref(database, `lobbies/${gameId}/queue/${userId}`));
    
        Alert.alert("Match Found!", `You have been matched with Player ${opponentId}`);
      }
    } else {
      await set(ref(database, `lobbies/${gameId}/queue/${userId}`), { userId });
      Alert.alert("Searching...", "Waiting for another player to join.");
    }
  };

  const leaveQueue = async (gameId, userId) => {
    const queueRef = ref(database, `lobbies/${gameId}/queue`);
    const snapshot = await get(queueRef);
    const queue = snapshot.val();
  
    if (queue) {
      const userEntry = Object.entries(queue).find(([key, data]) => data.userId === userId);
      if (userEntry) {
        await remove(ref(database, `lobbies/${gameId}/queue/${userEntry[0]}`));
        console.log("Removed from queue");
      }
    }
  };

  useEffect(() => {
    return () => {
      leaveQueue(gameId, userId);
    };
  }, []);

  useEffect(() => {
    const queueRef = ref(database, `lobbies/${gameId}/queue`);
    const unsubscribe = onValue(queueRef, (snapshot) => {
      const queue = snapshot.val();
      if (queue && Object.keys(queue).length > 1) {
        Alert.alert("Match Found!", "You have been matched with another player.");
      }
    });
  
    return () => unsubscribe();
  }, [gameId]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{gameName} Lobby</Text>
      <Button title="Find Match" onPress={findMatch} />
      <Button title="View Player List" onPress={() => navigation.navigate('PlayerList', { gameId })} />
      <Button title="View Stats" onPress={() => navigation.navigate('Stats', { gameId })} />
      <Button title="Back to Lobby List" onPress={() => navigation.goBack()} />
    </View>
  );
};


const PlayerListScreen = ({ route, navigation }) => {
  const { gameId, username } = route.params;
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const playersRef = ref(database, `lobbies/${gameId}/players`);

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const playerArray = Object.entries(data).map(([id, player]) => ({
          id,
          username: player.username || "Unknown Player",
          wins: player.wins || 0,
          losses: player.losses || 0
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('Profile', { 
              username: item.username, 
              isOwnProfile: false, 
              skillLevel: item.skillLevel, 
              favoriteGame: item.favoriteGame, 
              currentlyPlaying: item.currentlyPlaying, 
              totalMatches: item.totalMatches, 
              wins: item.wins, 
              losses: item.losses })}
          >
            <Text>{item.username}</Text>
            <Text>Wins/Losses: {item.wins}/{item.losses}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const StatsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lobby Stats</Text>
      <Text>Total Players: 0000</Text>
      <Text>Online Players: 0000</Text>
      <Text>24 Hour Peak: 0000</Text>
      <Text>Peak Days: 0000</Text>
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

  // Profile Screen Styles
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
});
