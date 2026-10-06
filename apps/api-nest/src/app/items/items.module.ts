import { Module } from '@nestjs/common';
import { CreateItemCommand } from './create-item.command';
import { CreateItemUc } from './create-item.uc';
import { MatchingWeather } from './matching-weather';
import { FilesController } from './files.controller';
import { GetItemQuery } from './get-item.query';
import { ItemsController } from './items.controller';
import { ListItemsQuery } from './list-items.query';
import { ListLookupsQuery } from './list-lookups.query';
import { createPgPool, PG_POOL } from './pg-pool';
import { ResolveItemRefsQuery } from './resolve-item-refs.query';
import { SoftDeleteItemCommand } from './soft-delete-item.command';
import { StoreItemFile } from './store-item-file';
import { UpdateItemCommand } from './update-item.command';
import { UpdateItemUc } from './update-item.uc';
import type {
  ICreateItemCommand,
  IGetItemQuery,
  IResolveItemRefsQuery,
  IStoreItemFile,
  IUpdateItemCommand,
} from './contract/items.port';

@Module({
  controllers: [ItemsController, FilesController],
  providers: [
    { provide: PG_POOL, useFactory: createPgPool },
    ListLookupsQuery,
    ResolveItemRefsQuery,
    ListItemsQuery,
    GetItemQuery,
    CreateItemCommand,
    UpdateItemCommand,
    SoftDeleteItemCommand,
    StoreItemFile,
    MatchingWeather,
    {
      provide: CreateItemUc,
      useFactory: (
        resolve: IResolveItemRefsQuery,
        store: IStoreItemFile,
        create: ICreateItemCommand,
        weather: MatchingWeather,
      ) => new CreateItemUc(resolve, store, create, weather),
      inject: [ResolveItemRefsQuery, StoreItemFile, CreateItemCommand, MatchingWeather],
    },
    {
      provide: UpdateItemUc,
      useFactory: (
        getItem: IGetItemQuery,
        resolve: IResolveItemRefsQuery,
        update: IUpdateItemCommand,
      ) => new UpdateItemUc(getItem, resolve, update),
      inject: [GetItemQuery, ResolveItemRefsQuery, UpdateItemCommand],
    },
  ],
})
export class ItemsModule {}
