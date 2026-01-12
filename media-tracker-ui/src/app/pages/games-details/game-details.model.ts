import { MediaItem } from "../../models/media-type.model";
import { GameMetadata } from "../../models/game-metadata.model";

export interface GameDetails extends MediaItem {
  metadata?: GameMetadata;
}
