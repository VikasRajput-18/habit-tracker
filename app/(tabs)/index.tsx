import {
  client,
  DATABASE_ID,
  databases,
  HABITS_COLLECTION_ID,
  RealTimeResponse,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Card, Surface, Text, useTheme } from "react-native-paper";

export default function Index() {
  const { signOut, user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const theme = useTheme();

  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  const fetchHabits = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABITS_COLLECTION_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      setHabits(response?.documents as Habit[]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, HABITS_COLLECTION_ID, id);
    } catch (error) {
      console.error(error);
    }
  };

  const renderLeftActions = () => {
    return (
      <View style={styles.swipeActionLeft}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={32}
          color={"#fff"}
        />
      </View>
    );
  };
  const renderRightActions = () => {
    return (
      <View style={styles.swipeActionRight}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={32}
          color={"#fff"}
        />
      </View>
    );
  };

  useEffect(() => {
    if (user) {
      const channel = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTION_ID}.documents`;
      const habitsSubscription = client.subscribe(
        channel,
        (response: RealTimeResponse) => {
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.update"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.delete"
            )
          ) {
            fetchHabits();
          }
        }
      );
      fetchHabits();

      return () => habitsSubscription();
    }
  }, [user]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          🔥 Today&apos;s Habits
        </Text>
        <Button mode="text" icon="logout" onPress={signOut}>
          Sign Out
        </Button>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {habits.length === 0 ? (
          <View style={styles.noHabits}>
            <MaterialCommunityIcons
              name="emoticon-sad-outline"
              size={48}
              color="#ccc"
            />
            <Text style={styles.noHabitsTitle}>No habits yet</Text>
            <Text style={styles.noHabitsSubtitle}>
              Add your first habit to get started!
            </Text>
          </View>
        ) : (
          habits.map((habit, index) => (
            <Swipeable
              ref={(ref) => {
                swipeableRefs.current[habit.$id] = ref;
              }}
              key={index}
              overshootLeft={false}
              overshootRight={false}
              renderLeftActions={renderLeftActions}
              renderRightActions={renderRightActions}
              onSwipeableOpen={(direction) => {
                if (direction === "left") {
                  handleDeleteHabit(habit.$id);
                }
                swipeableRefs.current[habit.$id]?.close();
              }}
            >
              <Surface style={styles.card} elevation={0}>
                <Card
                  style={{
                    borderColor: "#ccc",
                  }}
                  mode="outlined"
                >
                  <Card.Title
                    title={habit.title}
                    titleStyle={{ fontWeight: "bold" }}
                    left={() => (
                      <MaterialCommunityIcons
                        name="target"
                        size={28}
                        color={theme.colors.primary}
                      />
                    )}
                    style={styles.cardTitle}
                  />
                  <Card.Content style={styles.cardContent}>
                    <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                      {habit.description}
                    </Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.streakRow}>
                        <MaterialCommunityIcons
                          name="fire"
                          size={18}
                          color="#ff6d00"
                        />
                        <Text style={styles.streakText}>
                          {habit.streak_count} day streak
                        </Text>
                      </View>
                      <Text style={styles.frequency}>
                        ⏰{" "}
                        {habit.frequency.charAt(0).toUpperCase() +
                          habit.frequency.slice(1)}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </Surface>
            </Swipeable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: "#fdfdfd",
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  title: {
    fontWeight: "bold",
  },
  cardTitle: {
    padding: 0,
    margin: 0,
    minHeight: 60,
    marginBottom: -10,
    textAlign: "left",
  },
  noHabits: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  noHabitsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    color: "#555",
  },
  noHabitsSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardContent: {
    marginTop: 10,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  streakText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#ff6d00",
  },
  frequency: {
    fontStyle: "italic",
    color: "#616161",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  swipeActionLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
    flex: 1,
    backgroundColor: "#e53935",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingLeft: 16,
  },
  swipeActionRight: {
    justifyContent: "center",
    alignItems: "flex-end",
    flex: 1,
    backgroundColor: "#4caf50",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingRight: 16,
  },
});
