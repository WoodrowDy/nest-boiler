export class DBFindOptionDto {
  //`pessimistic_write`를 위해
  selectForUpdate?: boolean;

  //exclude 된 데이터까지 한번에 가져오기 위함
  selectAll?: boolean;

  //관계 추가 옵션
  relations?: string[];

  //exclude 된 컬럼을 특정하여 선택적으로 여러개 가져오게 하기 위함
  addiSelectFields?: string[];
}
