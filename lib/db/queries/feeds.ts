import { db } from "..";
import { feedFollows, feeds, type Feed, type FeedFollows, users } from "../schema";
import { eq, and } from "drizzle-orm";

export async function addFeed(
  name: string,
  url: string,
  userId: string,
) {
  const result = await db
    .insert(feeds)
    .values({
      name,
      url,
      userId,
    })
    .returning();

  return firstOrUndefined(result) as Feed;
}

export async function getFeeds(){
  const result = await db.select().from(feeds);
  return result;
}

export async function getFeedByUrl(url: string){
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result as Feed;
}

export function firstOrUndefined<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[0] : undefined;
}

export async function createFeedFollow(userId: string, feedId: string){
  const [newFeedFollow] = await db.insert(feedFollows).values({userId, feedId}).returning();
  const res = await db.select().from(feedFollows).innerJoin(feeds, eq(feedFollows.feedId, feeds.id)).innerJoin(users,eq(feedFollows.userId, users.id)).where(eq(feedFollows.id, newFeedFollow.id));
  return firstOrUndefined(res);
}

export async function getFeedFollowsForUser(userId: string){
  const result = await db.select().from(feedFollows).innerJoin(feeds, eq(feedFollows.feedId, feeds.id)).innerJoin(users, eq(feedFollows.userId, users.id)).where(eq(feedFollows.userId, userId));
  return result;
}

export async function deleteFeedFollow(userId: string, feedId: string){
   await db.delete(feedFollows).where(and(eq(feedFollows.userId, userId) ,eq(feedFollows.feedId, feedId)))
}

