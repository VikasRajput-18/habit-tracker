import {
  client,
  DATABASE_ID,
  databases,
  HABIT_COMPLETION_COLLECTION_ID,
  HABITS_COLLECTION_ID,
  RealTimeResponse,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitCompletion, StreakData } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Card, Text } from "react-native-paper";

export default function StreaksScreen() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitCompletion[]>([]);

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

  const fetchCompletions = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABIT_COMPLETION_COLLECTION_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      const completions = response?.documents as HabitCompletion[];
      setCompletedHabits(completions);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      const habitsChannel = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTION_ID}.documents`;
      const habitsSubscription = client.subscribe(
        habitsChannel,
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
      const completionChannel = `databases.${DATABASE_ID}.collections.${HABIT_COMPLETION_COLLECTION_ID}.documents`;
      const complitionsSubscription = client.subscribe(
        completionChannel,
        (response: RealTimeResponse) => {
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create"
            )
          ) {
            fetchCompletions();
          }
        }
      );
      fetchHabits();
      fetchCompletions();

      return () => {
        habitsSubscription();
        complitionsSubscription();
      };
    }
  }, [user]);
  const getStreakData = (habitId: string): StreakData => {
    const habitCompletions = completedHabits
      ?.filter((habit) => habit.habit_id === habitId)
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      );

    if (habitCompletions?.length === 0) {
      return { streak: 0, bestStreak: 0, total: 0 };
    }

    let streak = 1;
    let bestStreak = 1;
    let total = habitCompletions.length;

    let lastDate: Date | null = new Date(habitCompletions[0].completed_at);
    let currentStreak = 1;

    for (let i = 1; i < habitCompletions.length; i++) {
      const currentDate = new Date(habitCompletions[i].completed_at);
      const diffDays =
        (currentDate.getTime() - lastDate!.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays <= 1.5) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }

      lastDate = currentDate;
    }

    streak = currentStreak;
    return { streak, bestStreak, total };
  };

  const habitStreaks = habits.map((habit) => {
    const { streak, bestStreak, total } = getStreakData(habit.$id);
    return { habit, streak, bestStreak, total };
  });

  const rankedHabits = habitStreaks.sort((a, b) => b.bestStreak - a.bestStreak);

  const badgeStyles = [styles.badge1, styles.badge2, styles.badge3];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <Text style={styles.header}>🔥 Habit Streaks</Text>

      {rankedHabits.length > 0 && (
        <View>
          <Text variant="bodyLarge" style={{ textAlign: "center" }}>
            🎖️ Top Streaks
          </Text>
          {rankedHabits.slice(0, 3).map((item, key) => {
            return (
              <View key={key} style={styles.topStreakCard}>
                <View style={[styles.rankingBadge, badgeStyles[key]]}>
                  <Text
                    style={{ fontWeight: "bold", color: "#fff", fontSize: 16 }}
                  >
                    {key + 1}
                  </Text>
                </View>
                <Text style={styles.topTitle}>{item.habit.title}</Text>
                <Text style={styles.topStreak}>
                  🏆 Best Streak: {item.bestStreak}
                </Text>
              </View>
            );
          })}
        </View>
      )}

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
        rankedHabits.map(({ habit, streak, bestStreak, total }, key) => {
          const isFirst = key === 0;
          return (
            <Card key={key} style={isFirst ? styles.firstCard : styles.card}>
              <Card.Content>
                {isFirst && (
                  <View style={styles.firstCardIcon}>
                    <MaterialCommunityIcons
                      name="crown"
                      size={24}
                      color="#fbc02d"
                    />
                  </View>
                )}
                <Text
                  style={isFirst ? styles.firstCardText : styles.habitTitle}
                >
                  {habit.title}
                </Text>
                <Text
                  style={isFirst ? styles.firstCardLabel : styles.habitDesc}
                >
                  {habit.description}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>🔥 {streak}</Text>
                    <Text style={styles.statLabel}>Current</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>🏆 {bestStreak}</Text>
                    <Text style={styles.statLabel}>Best</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>✅ {total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f0f4f8", // light background
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  // 🎖️ Ranking Badges
  rankingBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  badge1: {
    backgroundColor: "#FFD700", // Gold
  },
  badge2: {
    backgroundColor: "#C0C0C0", // Silver
  },
  badge3: {
    backgroundColor: "#CD7F32", // Bronze
  },

  // 🏆 Top Streaks Card
  topStreakCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  topStreak: {
    fontSize: 16,
    color: "#444",
  },

  // 🥇 Champion Card
  firstCard: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: "#fff9c4", // soft yellow
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#fbc02d",
  },
  firstCardText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  firstCardLabel: {
    fontSize: 14,
    color: "#666",
    marginVertical: 8,
  },
  firstCardIcon: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 6,
    elevation: 5,
  },

  // 📋 All Habits Cards
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 3,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  habitDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },

  // 📊 Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
  },

  // 🚫 No Habits State
  noHabits: {
    marginTop: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  noHabitsTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 12,
    color: "#444",
  },
  noHabitsSubtitle: {
    fontSize: 15,
    color: "#777",
    marginTop: 6,
    textAlign: "center",
  },
});
