import { type RSSFeed } from "../config.js";
import { XMLParser } from "fast-xml-parser";

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  try {
    const response = await fetch(feedURL, { headers: { 'User-Agent': 'gator' } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const feedData = await response.text();
    const parser = new XMLParser();
    const parsedData = parser.parse(feedData);
    
    if (!parsedData.rss?.channel) {
      throw new Error("Channel does not exist");
    }
    
    const channel = parsedData.rss.channel;
    const rssFeed: RSSFeed = {
      channel: {
        title: channel.title || '',
        link: channel.link || '',
        description: channel.description || '',
        item: Array.isArray(channel.item) ? channel.item.map(processItem).filter(Boolean) : [],
      }
    };

    if (!rssFeed.channel.title || !rssFeed.channel.link || !rssFeed.channel.description) {
      throw new Error("Missing required metadata");
    }

    return rssFeed;
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
}

function processItem(item: any) {
  if (!item.title || !item.link) return null;
  return {
    title: item.title,
    link: item.link,
    description: item.description || '',
    pubDate: item.pubDate || '',
  };
}
