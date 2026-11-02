import type { SourceLocation, SubTyped, Typed } from '@traqula/core';
import { AstCoreFactory } from '@traqula/core';
import { ContextFactoryMixin } from './factoryMixins/ContextFactory.js';
import { ExpressionFactoryMixin } from './factoryMixins/ExpressionFactory.js';
import { GraphRefFactoryMixin } from './factoryMixins/GraphRefFactory.js';
import { asArg } from './factoryMixins/mixins.js';
import { PathFactoryMixin } from './factoryMixins/PathFactory.js';
import { PatternFactoryMixin } from './factoryMixins/Patternfactory.js';
import { QueryFactoryMixin } from './factoryMixins/QueryFactory.js';
import { SolutionModifiersFactoryMixin } from './factoryMixins/SolutionModifiersFactory.js';
import { TermFactoryMixin } from './factoryMixins/TermFactory.js';
import { UpdateOperationFactoryMixin } from './factoryMixins/UpdateOperationFactory.js';
import type {
  DatasetClauses,
  Gap,
  Slot,
  GraphNode,
  GraphQuads,
  PatternBgp,
  SequenceMember,
  Sparql11Nodes,
  Term,
  TermBlank,
  TermIri,
  TermVariable,
  TripleCollectionBlankNodeProperties,
  TripleCollectionList,
  TripleNesting,
  Update,
  Wildcard,
} from './Sparql11types.js';

/**
 * A factory that helps you create, and check types for AST nodes for SPARQL 1.1
 */
export class AstFactory extends asArg(AstCoreFactory)
  .call(ContextFactoryMixin)
  .call(ExpressionFactoryMixin)
  .call(GraphRefFactoryMixin)
  .call(PathFactoryMixin)
  .call(PatternFactoryMixin)
  .call(QueryFactoryMixin)
  .call(SolutionModifiersFactoryMixin)
  .call(TermFactoryMixin)
  .call(UpdateOperationFactoryMixin)
  .returns() {
  public alwaysSparql11(obj: object): obj is Sparql11Nodes {
    return true;
  }

  public isPath(obj: object): obj is SubTyped<'term', 'namedNode'> | Typed<'path'> {
    return this.isPathPure(obj) || this.isTermNamed(obj);
  }

  public isExpression(obj: object):
    obj is SubTyped<'term', 'namedNode' | 'variable' | 'literal'> | Typed<'expression'> {
    return this.isExpressionPure(obj) || this.isTermNamed(obj) || this.isTermVariable(obj) || this.isTermLiteral(obj);
  }

  public graphNodeIdentifier(graphNode: GraphNode): Term {
    return graphNode.type === 'tripleCollection' ? graphNode.identifier : graphNode;
  }

  public triple(
    subject: TripleNesting['subject'],
    predicate: TripleNesting['predicate'],
    object: TripleNesting['object'],
    loc?: SourceLocation,
  ): TripleNesting {
    return {
      type: 'triple',
      subject,
      predicate,
      object,
      loc: loc ?? this.sourceLocation(subject, predicate, object),
    };
  }

  public isTriple(obj: object): obj is Typed<'triple'> {
    return this.isOfType(obj, 'triple');
  }

  public datasetClauses(clauses: DatasetClauses['clauses'], loc: SourceLocation): DatasetClauses {
    return {
      type: 'datasetClauses',
      clauses,
      loc,
    };
  }

  public isDatasetClauses(obj: object): obj is Typed<'datasetClauses'> {
    return this.isOfType(obj, 'datasetClauses');
  }

  public wildcard(loc: SourceLocation): Wildcard {
    return { type: 'wildcard', loc };
  }

  public isWildcard(obj: object): obj is Typed<'wildcard'> {
    return this.isOfType(obj, 'wildcard');
  }

  public isTripleCollection(obj: object): obj is Typed<'tripleCollection'> {
    return this.isOfType(obj, 'tripleCollection');
  }

  public tripleCollectionBlankNodeProperties(
    identifier: TermBlank,
    triples: TripleNesting[],
    loc: SourceLocation,
  ): TripleCollectionBlankNodeProperties {
    return {
      type: 'tripleCollection',
      subType: 'blankNodeProperties',
      identifier,
      triples,
      loc,
    };
  }

  public isTripleCollectionBlankNodeProperties(obj: object):
    obj is SubTyped<'tripleCollection', 'blankNodeProperties'> {
    return this.isOfSubType(obj, 'tripleCollection', 'blankNodeProperties');
  }

  /**
   * rdf-array: a gap in a sequence pattern, `...` when unnamed, `...?variable` when it binds the run it matches.
   */
  public gap(variable: TermVariable | undefined, loc: SourceLocation): Gap {
    return { type: 'gap', ...(variable && { variable }), loc };
  }

  public isGap(obj: object): obj is Typed<'gap'> & { variable?: TermVariable } {
    return this.isOfType(obj, 'gap');
  }

  /**
   * Rdf-undef: the empty slot of a sequence, `undef`.
   */
  public slot(loc: SourceLocation): Slot {
    return { type: 'slot', loc };
  }

  public isSlot(obj: object): obj is Typed<'slot'> {
    return this.isOfType(obj, 'slot');
  }

  /**
   * rdf-array: a collection `( e1 e2 ... )` is one sequence term. An element that is a blank node property
   * list (or a nested list) contributes its triples, and the sequence holds its identifier. A gap stays a gap.
   */
  public tripleCollectionList(elements: (GraphNode | Gap | Slot)[], loc: SourceLocation): TripleCollectionList {
    const triples: TripleNesting[] = [];
    const identifiers: SequenceMember[] = elements.map((element) => {
      if (this.isTripleCollection(element)) {
        const collection = element;
        triples.push(...collection.triples);
        return collection.identifier;
      }
      return <SequenceMember> element;
    });
    return {
      type: 'tripleCollection',
      subType: 'list',
      identifier: this.termSequence(identifiers, this.sourceLocation()),
      elements,
      triples,
      loc,
    };
  }

  public isTripleCollectionList(obj: object):
    obj is SubTyped<'tripleCollection', 'list'> {
    return this.isOfSubType(obj, 'tripleCollection', 'list');
  }

  public graphQuads(graph: TermIri | TermVariable, triples: PatternBgp, loc: SourceLocation): GraphQuads {
    return {
      type: 'graph',
      graph,
      triples,
      loc,
    };
  }

  public isGraphQuads(obj: object): obj is GraphQuads {
    return super.isOfType(obj, 'graph');
  }

  public isUpdate(obj: object): obj is Update {
    return super.isOfType(obj, 'update');
  }
}
