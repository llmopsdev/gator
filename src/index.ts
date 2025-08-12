import {runCommand, registerCommand, handlerLogin, handlerReset,  readConfig, setUser, CommandsRegistry, handlerRegister, handlerUsers, handlerAgg, handlerCreateFeed, handlerFeeds, handlerFollow, handlerFollowing, middlewareLoggedIn, handlerUnfollow} from "../config";
async function main() {
  const regis: CommandsRegistry = {};
  await registerCommand(regis, "login", handlerLogin);
  await registerCommand(regis, "register", handlerRegister);
  await registerCommand(regis, "reset", handlerReset);
  await registerCommand(regis, "users", handlerUsers);
  await registerCommand(regis, "agg", handlerAgg);
  await registerCommand(regis, "addfeed", middlewareLoggedIn(handlerCreateFeed));
  await registerCommand(regis, "feeds", handlerFeeds);
  await registerCommand(regis, "follow", middlewareLoggedIn(handlerFollow));
  await registerCommand(regis, "following", middlewareLoggedIn(handlerFollowing));
  await registerCommand(regis, "unfollow", middlewareLoggedIn(handlerUnfollow));
  const args = process.argv;
  const commands = args.slice(2);
  if(commands.length < 1){
    console.log("No argument provided");
    process.exit(1);
  }
  const [cmdName, ...cmdArgs] = commands;
  try{
    await runCommand(regis, cmdName, ...cmdArgs);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  process.exit(0);
}

main();
