export type QueryNumberish = number | string | undefined;

export type PaginationQueryParams = {
  page?: QueryNumberish;
  limit?: QueryNumberish;
};
