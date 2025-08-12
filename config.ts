import fs from "fs";
import os from "os";
import path from "path";
import {fetchFeed} from "src/fetchfeed";
import { createUser, getUser, resetUsers, getUsers, getUserByID } from "./lib/db/queries/users";
import { addFeed, createFeedFollow, deleteFeedFollow, getFeedByUrl, getFeedFollowsForUser, getFeeds } from "./lib/db/queries/feeds";
import { Feed, User } from "./lib/db/schema";

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

type Config = {
  dbUrl: string;
  currentUserName: string;
};

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type middlewareLoggedIn = (handler: UserCommandHandler) => CommandHandler;

export const middlewareLoggedIn: middlewareLoggedIn = (handler) => async (cmdName, ...args) => {
  const config = readConfig();
  const user = await getUser(config.currentUserName);
  if (!user) {
    throw new Error("Current user is not logged in");
  }
  await handler(cmdName, user, ...args);
};

export type CommandsRegistry = Record<string, CommandHandler>;

export const handlerUnfollow: UserCommandHandler = async (cmdName, user, ...args) =>  {
  const feed = await getFeedByUrl(args[0]);
  if(!feed){
    throw new Error("Specified feed url does not exist");
  }
  await deleteFeedFollow(user.id, feed.id);
  console.log("Record has been successfully deleted");
}

export const handlerFollowing: UserCommandHandler = async (cmdName, user, ...args) => {
  const res = await getFeedFollowsForUser(user.id);
  res.forEach((r) => console.log(r.feeds.name));
};

export const handlerFollow: UserCommandHandler = async (cmdName, user, ...args) => {
  if (args.length < 1) {
    throw new Error("You must provide a url to follow");
  }

  const url = args[0];
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error("No feed found registered under the provided url");
  }

  await createFeedFollow(user.id, feed.id);

  console.log(`Feed name: ${feed.name}`);
  console.log(`User name: ${user.name}`);
};


export async function handlerFeeds(){
  const res = await getFeeds();
  const usersPromises = res.map(r => getUserByID(r.userId));
  const users = await Promise.all(usersPromises);
  res.forEach((feed, i) => printFeed(feed, users[i]));
}

export const handlerCreateFeed: UserCommandHandler = async (cmdName, user, ...args) => {
  if (args.length < 2) {
    throw new Error("Two arguments name and url required to add a feed");
  }

  const [name, url] = args;

  const res: Feed = await addFeed(name, url, user.id);
  console.log("Feed created successfully");
  printFeed(res, user);

  await createFeedFollow(user.id, res.id);
};

function printFeed(feed: Feed, user: User) {
  console.log(`* ID:            ${feed.id}`);
  console.log(`* Created:       ${feed.createdAt}`);
  console.log(`* Updated:       ${feed.updatedAt}`);
  console.log(`* name:          ${feed.name}`);
  console.log(`* URL:           ${feed.url}`);
  console.log(`* User:          ${user.name}`);
}

export async function handlerAgg(cmdName: string, ...args: string[]){
  const res = await fetchFeed("https://www.wagslane.dev/index.xml");
  console.log(JSON.stringify(res, null, 4));
}

export async function handlerUsers(cmdName: string, ...args: string[]): Promise<void> {
  const users = await getUsers();
  const config = readConfig();
  users.forEach(user => {
    console.log(`* ${user.name}${user.name === config.currentUserName ? ' (current)' : ''}`);
  });
}

export async function handlerReset(cmdName: string, ...args: string[]){
  await resetUsers();
  process.exit(0);
}

export async function handlerRegister(cmdName: string, ...args: string[]){
  if(args.length === 0){
    throw new Error("handler register requires a username");
  }
  if(await getUser(args[0])){
    throw new Error("user is already registered");
  }
  const user = await createUser(args[0]);
  await setUser(args[0]);
  console.log(`${args[0]} registered as a user`);
  console.log(user);
}
export async function handlerLogin(cmdName:string, ...args: string[]){
  if(args.length === 0){
    throw new Error("handler login requires a username");
  }
  if(!(await getUser(args[0]))){
    throw new Error(`${args[0]} is not a registered user`);

  }
  await setUser(args[0]);
  console.log(`currentUser has been set to ${args[0]}`);
}

export async function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler){
  if(registry[cmdName]){
    throw new Error(`${cmdName} already registered`);
  }
  registry[cmdName] = handler;

}
export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]){
  if(!registry[cmdName]){
    throw new Error(`${cmdName} not a registered command`);
  }
  await registry[cmdName](cmdName, ...args);
}

export async function setUser(userName: string) {
  const config = readConfig();
  config.currentUserName = userName;
  writeConfig(config);
}

function validateConfig(rawConfig: any) {
  if (!rawConfig.db_url || typeof rawConfig.db_url !== "string") {
    throw new Error("db_url is required in config file");
  }
  if (
    !rawConfig.current_user_name ||
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("current_user_name is required in config file");
  }

  const config: Config = {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };

  return config;
}

export function readConfig() {
  const fullPath = getConfigFilePath();

  const data = fs.readFileSync(fullPath, "utf-8");
  const rawConfig = JSON.parse(data);

  return validateConfig(rawConfig);
}

function getConfigFilePath() {
  const configFileName = ".gatorconfig.json";
  const homeDir = os.homedir();
  return path.join(homeDir, configFileName);
}

function writeConfig(config: Config) {
  const fullPath = getConfigFilePath();

  const rawConfig = {
    db_url: config.dbUrl,
    current_user_name: config.currentUserName,
  };

  const data = JSON.stringify(rawConfig, null, 2);
  fs.writeFileSync(fullPath, data, { encoding: "utf-8" });
}


